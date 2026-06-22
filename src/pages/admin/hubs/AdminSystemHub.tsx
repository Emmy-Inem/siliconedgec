import { HubShell } from "./HubShell";
import AdminUsers from "../AdminUsers";
import AdminSettings from "../AdminSettings";
import AdminLoginSecurity from "../AdminLoginSecurity";
import AdminSessions from "../AdminSessions";
import AdminActivityLog from "../AdminActivityLog";
import AdminSEO from "../AdminSEO";
import AdminCustomScripts from "../AdminCustomScripts";
import AdminBackupStatus from "../AdminBackupStatus";
import AdminHelp from "../AdminHelp";
import AdminWebhookEvents from "../AdminWebhookEvents";
import AdminBlockedIps from "../AdminBlockedIps";
import AdminGdprTools from "../AdminGdprTools";
import AdminMaintenance from "../AdminMaintenance";

export default function AdminSystemHub() {
  return (
    <HubShell
      title="System"
      description="Users, security, SEO and platform settings"
      tabs={[
        { value: "users", label: "Users & Roles", content: <AdminUsers /> },
        { value: "settings", label: "Settings", content: <AdminSettings /> },
        { value: "login-security", label: "Login Security", content: <AdminLoginSecurity /> },
        { value: "sessions", label: "Active Sessions", content: <AdminSessions /> },
        { value: "activity-log", label: "Activity Log", content: <AdminActivityLog /> },
        { value: "seo", label: "SEO", content: <AdminSEO /> },
        { value: "custom-scripts", label: "Custom Scripts", content: <AdminCustomScripts /> },
        { value: "backups", label: "Backups", content: <AdminBackupStatus /> },
        { value: "webhooks", label: "Webhooks", content: <AdminWebhookEvents /> },
        { value: "blocked-ips", label: "Blocked IPs", content: <AdminBlockedIps /> },
        { value: "gdpr", label: "GDPR Tools", content: <AdminGdprTools /> },
        { value: "maintenance", label: "Maintenance", content: <AdminMaintenance /> },
        { value: "help", label: "Help Center", content: <AdminHelp /> },
      ]}
    />
  );
}