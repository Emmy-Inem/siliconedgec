import { HubShell } from "./HubShell";
import AdminAnalytics from "../AdminAnalytics";
import AdminMarketingAnalytics from "../AdminMarketingAnalytics";
import AdminCourseHealth from "../AdminCourseHealth";
import AdminUserActivity from "../AdminUserActivity";
import AdminWishlistInsights from "../AdminWishlistInsights";
import AdminTrackingQA from "../AdminTrackingQA";
import AdminAuthReplay from "../AdminAuthReplay";
import AdminIntakes from "../AdminIntakes";
import AnalyticsOverview from "@/components/admin/analytics/AnalyticsOverview";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function AdminAnalyticsHub() {
  const [params] = useSearchParams();
  const [details, setDetails] = useState(() => !!params.get("tab") && params.get("tab") !== "overview");
  return (
    <div className="space-y-4">
    <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => setDetails(value => !value)}>{details ? "Simple overview" : "Detailed reports"}</Button></div>
    {details ?
    <HubShell
      title="Analytics"
      tabs={[
        { value: "overview", label: "Overview", content: <AnalyticsOverview /> },
        { value: "platform", label: "Platform", content: <AdminAnalytics /> },
        { value: "intakes", label: "Intakes by Cohort", content: <AdminIntakes /> },
        { value: "marketing", label: "Marketing", content: <AdminMarketingAnalytics /> },
        { value: "tracking-qa", label: "Tracking QA", content: <AdminTrackingQA /> },
        { value: "auth-replay", label: "Auth Replay", content: <AdminAuthReplay /> },
        { value: "course-health", label: "Course Health", content: <AdminCourseHealth /> },
        { value: "user-activity", label: "User Activity", content: <AdminUserActivity /> },
        { value: "wishlist", label: "Wishlist Insights", content: <AdminWishlistInsights /> },
      ]}
    />
    : <><h1 className="font-heading text-2xl font-bold">Analytics</h1><AnalyticsOverview /></>}
    </div>
  );
}