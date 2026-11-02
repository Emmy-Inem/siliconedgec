export function installmentPaymentMatches(payment: any, agreement: any, provider: { gateway: string; amount: number; currency: string; reference: string; userId: string; providerId?: string }) {
  return payment.gateway === provider.gateway && Number(payment.amount_minor) === provider.amount &&
    agreement.currency === provider.currency.toUpperCase() && payment.reference === provider.reference &&
    agreement.user_id === provider.userId && (!payment.provider_id || !provider.providerId || payment.provider_id === provider.providerId);
}

/** Call only with provider-authenticated data, never the unverified webhook body. */
export async function settleVerifiedInstallment(admin: any, paymentId: string, provider: Parameters<typeof installmentPaymentMatches>[2]) {
  const { data: payment, error } = await admin.from("course_payment_installments").select("*, course_payment_agreements!inner(*)").eq("id", paymentId).single();
  if (error || !payment || !installmentPaymentMatches(payment, payment.course_payment_agreements, provider)) throw new Error("Installment payment mismatch.");
  const { error: settleError } = await admin.rpc("settle_course_installment", { p_payment_id: payment.id });
  if (settleError) throw settleError;
}
