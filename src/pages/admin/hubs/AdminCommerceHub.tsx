import { HubShell } from "./HubShell";
import AdminOrders from "../AdminOrders";
import AdminPricing from "../AdminPricing";
import AdminCartAbandonment from "../AdminCartAbandonment";
import AdminInfluencerMarketing from "../AdminInfluencerMarketing";
import AdminPromoCodes from "../AdminPromoCodes";
import AdminBootcamps from "../AdminBootcamps";

export default function AdminCommerceHub() {
  return (
    <HubShell
      title="Commerce"
      description="Orders, pricing, recovery and influencer programs"
      tabs={[
        { value: "orders", label: "Orders", content: <AdminOrders /> },
        { value: "pricing", label: "Pricing Plans", content: <AdminPricing /> },
        { value: "promo-codes", label: "Promo Codes", content: <AdminPromoCodes /> },
        { value: "bootcamps", label: "Bootcamps", content: <AdminBootcamps /> },
        { value: "cart-abandonment", label: "Cart Abandonment", content: <AdminCartAbandonment /> },
        { value: "influencers", label: "Influencer Marketing", content: <AdminInfluencerMarketing /> },
      ]}
    />
  );
}