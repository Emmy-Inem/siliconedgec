// Verifies a cart-level Paystack transaction and enrolls the user in all line items.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Paystack not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { reference } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "reference required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const psRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const psData = await psRes.json();

    if (!psData.status || psData.data?.status !== "success") {
      // Mark all line orders failed
      await supabase.from("orders").update({ status: "failed" }).like("reference", `${reference}--%`);
      return new Response(JSON.stringify({ verified: false, message: psData.data?.gateway_response ?? "Payment failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up all line orders sharing this cart reference
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .like("reference", `${reference}--%`);

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ error: "No orders found for reference" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = orders[0].user_id;
    const courseIds: string[] = [];
    for (const o of orders) {
      await supabase.from("orders").update({
        status: "completed",
        paystack_reference: psData.data.reference,
      }).eq("id", o.id);
      await supabase.from("enrollments").upsert(
        { user_id: o.user_id, course_id: o.course_id, payment_status: "paid" },
        { onConflict: "user_id,course_id" },
      );
      courseIds.push(o.course_id);
    }

    // Clear the user's cart for these courses
    await supabase.from("cart_items").delete().eq("user_id", userId).in("course_id", courseIds);

    // Influencer attribution per line item — based on order metadata UTM or explicit promo
    for (const o of orders) {
      try {
        const orderUtm = (o.metadata && (o.metadata as any).utm) || {};
        let promoIdForReferral: string | null = o.promo_code_id ?? null;
        let promoForCommission: any = null;

        if (promoIdForReferral) {
          const { data } = await supabase.from("promo_codes")
            .select("id, commission_percentage").eq("id", promoIdForReferral).maybeSingle();
          promoForCommission = data;
        } else if (orderUtm.utm_campaign || orderUtm.utm_source) {
          let promoRow: any = null;
          if (orderUtm.utm_campaign) {
            const { data } = await supabase.from("promo_codes")
              .select("id, commission_percentage")
              .ilike("code", orderUtm.utm_campaign).eq("is_active", true).maybeSingle();
            promoRow = data;
          }
          if (!promoRow && orderUtm.utm_source) {
            const { data } = await supabase.from("promo_codes")
              .select("id, commission_percentage")
              .ilike("slug", orderUtm.utm_source).eq("is_active", true).maybeSingle();
            promoRow = data;
          }
          if (promoRow) { promoIdForReferral = promoRow.id; promoForCommission = promoRow; }
        }

        if (promoIdForReferral || orderUtm.utm_source || orderUtm.utm_campaign) {
          const commissionPct = Number(promoForCommission?.commission_percentage ?? 0);
          const commission = (Number(o.amount) * commissionPct) / 100;
          await supabase.from("influencer_referrals").upsert(
            {
              promo_code_id: promoIdForReferral,
              user_id: o.user_id,
              course_id: o.course_id,
              conversion_type: "paid_enrollment",
              order_id: o.id,
              original_price: Number(o.amount) + Number(o.discount_amount ?? 0),
              discount_applied: Number(o.discount_amount ?? 0),
              final_price: Number(o.amount),
              commission_earned: commission,
              utm_source: orderUtm.utm_source ?? null,
              utm_medium: orderUtm.utm_medium ?? null,
              utm_campaign: orderUtm.utm_campaign ?? null,
              utm_content: orderUtm.utm_content ?? null,
            },
            { onConflict: "user_id,course_id,conversion_type", ignoreDuplicates: false },
          );
        }
      } catch (e) { console.error("cart influencer attribution failed", e); }
    }

    // Audit trail — one row per line item, attributed to the buying user (system verify)
    try {
      const total = orders.reduce((s: number, o: any) => s + Number(o.amount ?? 0), 0);
      const rows = orders.map((o: any) => ({
        admin_user_id: userId,
        entity_type: "order",
        entity_id: o.id,
        action: "verify",
        details: {
          channel: "paystack",
          checkout_type: "cart",
          cart_reference: reference,
          paystack_reference: psData.data.reference,
          amount: Number(o.amount ?? 0),
          cart_total: total,
          currency: o.currency,
          line_count: orders.length,
          gateway_response: psData.data?.gateway_response,
          ip: psData.data?.ip_address,
        },
      }));
      await supabase.from("admin_activity_log").insert(rows);
    } catch (e) { console.error("cart audit insert failed", e); }

    // Send enrollment confirmation email (best effort)
    try {
      const { data: { user: userRow } } = await supabase.auth.admin.getUserById(userId);
      const recipient = userRow?.email;
      if (recipient) {
        const { data: profileRow } = await supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
        const { data: courseRows } = await supabase.from("courses").select("title").in("id", courseIds);
        const courseList = (courseRows ?? []).map((c: any) => `• ${c.title}`).join("\n");
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${anon}` },
          body: JSON.stringify({
            template_key: "tpl_enrollment",
            to: recipient,
            variables: {
              name: profileRow?.full_name || recipient.split("@")[0],
              course_title: `${courseIds.length} course(s)`,
              course_url: `https://siliconedgec.lovable.app/dashboard`,
              course_list: courseList,
            },
          }),
        }).catch((e) => console.error("send-email cart enrollment failed", e));
      }
    } catch (e) {
      console.error("cart enrollment email failed", e);
    }

    return new Response(JSON.stringify({
      verified: true,
      course_ids: courseIds,
      total: orders.reduce((s, o: any) => s + Number(o.amount), 0),
      currency: orders[0].currency,
      reference,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("paystack-cart-verify error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});