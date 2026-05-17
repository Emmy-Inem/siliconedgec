import { supabase } from "@/integrations/supabase/client";
import { getStoredUtmParams } from "@/hooks/useUtmTracking";

export type ConversionType = "webinar_registration" | "free_enrollment" | "paid_enrollment";

/**
 * Try to resolve a promo_code id from the currently-stored UTM attribution.
 * Matching strategy (any one):
 *  1) utm_campaign === code (case-insensitive)
 *  2) promo_codes.utm_source/medium/campaign all match
 *  3) utm_source matches the promo's slug
 */
export async function resolveInfluencerPromoFromUtm(): Promise<{
  id: string;
  code: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
} | null> {
  const utm = getStoredUtmParams();
  if (!utm.utm_source && !utm.utm_campaign && !utm.utm_content) return null;

  // First try campaign === code (via SECURITY DEFINER RPC; promo_codes table is no longer publicly readable)
  if (utm.utm_campaign) {
    const { data } = await (supabase.rpc as any)("validate_promo_code", { p_code: utm.utm_campaign });
    const row = Array.isArray(data) ? data[0] : data;
    if (row) return row as any;
  }

  // Then by slug == utm_source
  if (utm.utm_source) {
    const { data } = await (supabase.rpc as any)("resolve_promo_slug", { p_slug: utm.utm_source.toLowerCase() });
    const row = Array.isArray(data) ? data[0] : data;
    if (row) return row as any;
  }

  return null;
}

/**
 * Record a conversion in influencer_referrals. Idempotent thanks to the
 * (user_id, course_id, conversion_type) unique index — duplicates are ignored.
 */
export async function recordInfluencerConversion(opts: {
  userId: string;
  courseId: string;
  conversionType: ConversionType;
  originalPrice?: number;
  discountApplied?: number;
  finalPrice?: number;
  commissionEarned?: number;
  promoCodeId?: string | null;
  orderId?: string | null;
  registrationId?: string | null;
}) {
  const utm = getStoredUtmParams();
  let promoId = opts.promoCodeId ?? null;
  if (!promoId) {
    const promo = await resolveInfluencerPromoFromUtm();
    if (promo) promoId = promo.id;
  }

  // Only record if there is *some* attribution (promo OR UTM source/campaign/content)
  if (!promoId && !utm.utm_source && !utm.utm_campaign && !utm.utm_content) return;

  const { error } = await (supabase.from("influencer_referrals") as any).upsert(
    {
      user_id: opts.userId,
      course_id: opts.courseId,
      conversion_type: opts.conversionType,
      promo_code_id: promoId,
      order_id: opts.orderId ?? null,
      registration_id: opts.registrationId ?? null,
      original_price: opts.originalPrice ?? 0,
      discount_applied: opts.discountApplied ?? 0,
      final_price: opts.finalPrice ?? 0,
      commission_earned: opts.commissionEarned ?? 0,
      utm_source: utm.utm_source ?? null,
      utm_medium: utm.utm_medium ?? null,
      utm_campaign: utm.utm_campaign ?? null,
      utm_content: utm.utm_content ?? null,
    },
    { onConflict: "user_id,course_id,conversion_type", ignoreDuplicates: true },
  );
  if (error) {
    // Surface to console so you can see attribution failures during testing,
    // but never block the registration/checkout flow.
    console.warn("[influencer-attribution] failed to record referral", error);
  }
}