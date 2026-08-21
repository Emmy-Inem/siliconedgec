import { HubShell } from "./HubShell";
import AdminCourseAnnouncements from "../AdminCourseAnnouncements";
import AdminNotifications from "../AdminNotifications";
import AdminLiveClasses from "../AdminLiveClasses";
import AdminChat from "../AdminChat";
import AdminSupportTickets from "../AdminSupportTickets";
import AdminEmail from "../AdminEmail";
import AdminEmailTemplates from "../AdminEmailTemplates";
import AdminNewsletter from "../AdminNewsletter";
import AdminEmailDelivery from "../AdminEmailDelivery";
import AdminEmailQueue from "../AdminEmailQueue";
import AdminAutomations from "../AdminAutomations";

export default function AdminCommunicationHub() {
  return (
    <HubShell
      title="Communication"
      description="Announcements, email, live classes and chat"
      tabs={[
        { value: "announcements", label: "Announcements", content: <AdminCourseAnnouncements /> },
        { value: "notifications", label: "Notifications", content: <AdminNotifications /> },
        { value: "live-classes", label: "Live Classes", content: <AdminLiveClasses /> },
        { value: "chat", label: "Live Chat", content: <AdminChat /> },
        { value: "tickets", label: "Support Tickets", content: <AdminSupportTickets /> },
        { value: "email", label: "Email Blasts", content: <AdminEmail /> },
        { value: "email-templates", label: "Email Templates", content: <AdminEmailTemplates /> },
        { value: "newsletter", label: "Newsletter", content: <AdminNewsletter /> },
        { value: "email-delivery", label: "Email Delivery", content: <AdminEmailDelivery /> },
        { value: "email-queue", label: "Email Queue", content: <AdminEmailQueue /> },
        { value: "automations", label: "Automations", content: <AdminAutomations /> },
      ]}
    />
  );
}