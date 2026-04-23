import { HubShell } from "./HubShell";
import AdminOrders from "../AdminOrders";
import AdminPricing from "../AdminPricing";
import AdminCartAbandonment from "../AdminCartAbandonment";
import AdminInfluencerMarketing from "../AdminInfluencerMarketing";

export default function AdminCommerceHub() {
  return (
    <HubShell
      title="Commerce"
      description="Orders, pricing, recovery and influencer programs"
      tabs={[
        { value: "orders", label: "Orders", content: <AdminOrders /> },
        { value: "pricing", label: "Pricing Plans", content: <AdminPricing /> },
        { value: "cart-abandonment", label: "Cart Abandonment", content: <AdminCartAbandonment /> },
        { value: "influencers", label: "Influencer Marketing", content: <AdminInfluencerMarketing /> },
      ]}
    />
  );
}