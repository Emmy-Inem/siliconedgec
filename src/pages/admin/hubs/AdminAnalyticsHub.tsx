import { HubShell } from "./HubShell";
import AdminAnalytics from "../AdminAnalytics";
import AdminMarketingAnalytics from "../AdminMarketingAnalytics";
import AdminCourseHealth from "../AdminCourseHealth";
import AdminUserActivity from "../AdminUserActivity";
import AdminWishlistInsights from "../AdminWishlistInsights";
import AdminTrackingQA from "../AdminTrackingQA";
import AdminAuthReplay from "../AdminAuthReplay";
import AdminIntakes from "../AdminIntakes";

export default function AdminAnalyticsHub() {
  return (
    <HubShell
      title="Analytics"
      description="Platform performance, marketing, and engagement insights"
      tabs={[
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
  );
}