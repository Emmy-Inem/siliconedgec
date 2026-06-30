// Daily job: mark active enrollments overdue and revoke access past end date.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const today = new Date().toISOString().slice(0, 10);

  // 1) Mark overdue
  const { data: overdue } = await supabase
    .from("bootcamp_enrollments")
    .select("id, user_id, full_name, email, next_due_date")
    .eq("status", "active")
    .lt("next_due_date", today);

  if (overdue && overdue.length) {
    const ids = overdue.map((e: any) => e.id);
    await supabase.from("bootcamp_enrollments").update({ status: "overdue" }).in("id", ids);
    const notes = overdue
      .filter((e: any) => e.user_id)
      .map((e: any) => ({
        user_id: e.user_id,
        title: "Bootcamp payment overdue",
        message: `Your installment due on ${e.next_due_date} is past due. Please pay to keep access.`,
        type: "warning",
        link: "/bootcamp",
      }));
    if (notes.length) await supabase.from("notifications").insert(notes);
  }

  // 2) Revoke access for unpaid past end date.
  const { data: expired } = await supabase
    .from("bootcamp_enrollments")
    .select("id, user_id, cohort_id, bootcamp_cohorts:cohort_id(end_date, course_id)")
    .neq("status", "completed")
    .neq("status", "access_revoked");

  const toRevoke = (expired ?? []).filter((e: any) => {
    const end = e?.bootcamp_cohorts?.end_date;
    return end && end < today;
  });

  if (toRevoke.length) {
    const ids = toRevoke.map((e: any) => e.id);
    await supabase.from("bootcamp_enrollments").update({
      access_granted: false,
      status: "access_revoked",
    }).in("id", ids);

    for (const e of toRevoke) {
      const courseId = e?.bootcamp_cohorts?.course_id;
      if (courseId && e.user_id) {
        await supabase.from("enrollments").update({ payment_status: "comped_revoked" })
          .eq("user_id", e.user_id).eq("course_id", courseId);
      }
      if (e.user_id) {
        await supabase.from("notifications").insert({
          user_id: e.user_id,
          title: "Bootcamp access revoked",
          message: "Your bootcamp access has been revoked because payment was not completed by the end date.",
          type: "error",
          link: "/bootcamp",
        });
      }
    }
  }

  return new Response(JSON.stringify({
    overdue: overdue?.length ?? 0,
    revoked: toRevoke.length,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});