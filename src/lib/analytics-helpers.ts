/**
 * Single source of truth for admin analytics rules.
 *
 * Keep these in sync with:
 *  - paystack-verify / paystack-cart-verify (sets payment_status = "paid")
 *  - auto_record_influencer_referral trigger (creates "free" enrollments
 *    alongside webinar course_registrations)
 *  - send-bulk-announcement (filters paying customers by these statuses)
 */

export const PAID_STATUSES = ["paid", "confirmed"] as const;
export const FREE_STATUS = "free" as const;

export const isPaidEnrollment = (e: { payment_status?: string | null }) =>
  e.payment_status === "paid" || e.payment_status === "confirmed";

export const isFreeEnrollment = (e: { payment_status?: string | null }) =>
  e.payment_status === "free";

/** form_type values that represent a webinar/event registration. */
export const isWebinarFormType = (ft?: string | null) =>
  !!ft && (ft === "webinar_registration" || ft.startsWith("webinar"));

/** form_type values that represent a paid course conversion. */
export const isCourseConversionFormType = (ft?: string | null) =>
  !!ft &&
  (ft === "paid_enrollment" ||
    ft === "enrollment" ||
    ft === "purchase" ||
    ft === "checkout_complete" ||
    ft === "course_registration");

/** form_type values that represent a generic page view (no conversion). */
export const isPageViewFormType = (ft?: string | null) =>
  ft === "pageview" || ft === "page_visit";

export type EnrollmentLite = {
  user_id: string;
  course_id: string;
  payment_status?: string | null;
};

/**
 * Free enrollments are auto-created by the registration trigger. Counting
 * both `course_registrations` AND those `free` enrollments duplicates the
 * same lead. Use this to filter out the shadow rows.
 */
export function dedupeFreeShadowEnrollments<T extends EnrollmentLite>(
  enrollments: T[],
  registrations: { user_id?: string | null; course_id?: string | null }[],
): T[] {
  const regKeys = new Set(
    registrations
      .filter((r) => r.user_id && r.course_id)
      .map((r) => `${r.user_id}::${r.course_id}`),
  );
  return enrollments.filter((e) => {
    if (!isFreeEnrollment(e)) return true;
    return !regKeys.has(`${e.user_id}::${e.course_id}`);
  });
}
