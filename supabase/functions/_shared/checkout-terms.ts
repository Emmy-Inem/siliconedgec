export const PAYMENT_TERMS_VERSION = "2026-11-02";

/** Validate before creating an order, free enrollment, or provider session. */
export async function recordCheckoutTerms(admin: any, userId: string, body: any) {
  if (body.terms_accepted !== true || body.terms_version !== PAYMENT_TERMS_VERSION) {
    throw new Error("Please read and accept the current payment terms before continuing.");
  }
  const courseIds = Array.isArray(body.course_ids) ? body.course_ids : [body.course_id];
  const { error } = await admin.from("checkout_terms_acceptances").insert({
    user_id: userId, version: PAYMENT_TERMS_VERSION, course_ids: courseIds,
    currency: String(body.currency || "NGN").toUpperCase(),
    payment_option: body.payment_option === "installments" ? "installments" : "full",
  });
  if (error) throw new Error("Unable to save your payment terms acceptance. Please try again.");
}
