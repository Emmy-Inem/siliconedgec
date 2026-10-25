import { currencyFactor } from "./currency-config.ts";

interface Order {
  user_id: string; course_id: string; reference: string; amount: number | string;
  currency: string; stripe_session_id?: string | null; payment_gateway?: string | null;
  metadata?: { cart_reference?: string } | null;
}
interface Session {
  id: string; amount_total?: number; currency?: string; client_reference_id?: string;
  metadata?: Record<string, string>;
}

/** Payment identity and stored totals must agree before any status change. */
export function stripeSessionMatchesOrders(session: Session, orders: Order[]): boolean {
  if (!orders.length || !session.metadata?.user_id || !session.client_reference_id) return false;
  const cart = session.metadata.cart === "true";
  if (!cart && orders.length !== 1) return false;
  const ids = new Set(session.metadata.course_ids?.split(",") ?? []);
  if (cart && (ids.size !== orders.length || session.metadata.cart_reference !== session.client_reference_id)) return false;
  let minor = 0;
  for (const order of orders) {
    const amount = Number(order.amount);
    if (!Number.isFinite(amount) || amount < 0 || order.payment_gateway !== "stripe" ||
        order.user_id !== session.metadata.user_id || order.stripe_session_id !== session.id ||
        order.currency.toLowerCase() !== session.currency?.toLowerCase()) return false;
    if (cart ? order.metadata?.cart_reference !== session.client_reference_id || !ids.has(order.course_id)
      : order.reference !== session.client_reference_id || session.metadata.course_id !== order.course_id) return false;
    minor += Math.round(amount * currencyFactor(order.currency));
  }
  return minor === session.amount_total;
}