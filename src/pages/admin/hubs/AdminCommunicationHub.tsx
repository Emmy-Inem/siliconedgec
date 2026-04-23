import { HubShell } from "./HubShell";
import AdminCourseAnnouncements from "../AdminCourseAnnouncements";
import AdminNotifications from "../AdminNotifications";
import AdminLiveClasses from "../AdminLiveClasses";
import AdminChat from "../AdminChat";
import AdminEmail from "../AdminEmail";
import AdminEmailTemplates from "../AdminEmailTemplates";

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
        { value: "email", label: "Email Blasts", content: <AdminEmail /> },
        { value: "email-templates", label: "Email Templates", content: <AdminEmailTemplates /> },
      ]}
    />
  );
}