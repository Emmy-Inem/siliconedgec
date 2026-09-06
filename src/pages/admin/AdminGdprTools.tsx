import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Download, UserX, FileJson } from "lucide-react";

// Every public table with a user_id column, per a scan of supabase/migrations
// (see the "grep -c CREATE TABLE ... user_id" audit). This was previously a
// hand-picked 13-table list that missed most of the app's tables — meaning
// "Erase Data" silently left personal data behind in ~30 tables. If a new
// table with a user_id column is added, add it here too.
const EXPORT_TABLES = [
  "profiles", "enrollments", "orders", "certificates", "bookmarks",
  "lesson_progress", "lesson_notes", "lesson_comments", "reviews",
  "course_registrations", "notifications", "user_xp_events", "quiz_attempts",
  "affiliates", "affiliate_referrals", "ai_conversations", "ai_quiz_attempts",
  "ai_quiz_reveals", "assignment_submissions", "automation_events",
  "bootcamp_enrollments", "cart_items", "chat_conversations", "cohort_members",
  "cohort_post_reactions", "cohort_posts", "cohort_reads", "cohort_session_rsvps",
  "course_qna", "email_delivery_log", "finance_refunds", "google_calendar_tokens",
  "influencer_referrals", "installment_plans", "job_applications", "lead_sources",
  "live_class_calendar_events", "mock_interview_sessions", "newsletter_subscribers",
  "study_plans", "support_tickets", "user_activity_log", "user_favorites", "user_roles",
];

export default function AdminGdprTools() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function exportUser() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const userId = email.trim();
      const payload: Record<string, any> = { user_id: userId, exported_at: new Date().toISOString() };
      const failedTables: string[] = [];
      for (const t of EXPORT_TABLES) {
        const { data, error } = await supabase.from(t as any).select("*").eq("user_id", userId);
        if (error) failedTables.push(t);
        payload[t] = data ?? [];
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `gdpr-export-${userId}.json`; a.click();
      URL.revokeObjectURL(url);
      if (failedTables.length) {
        toast({
          title: "Export incomplete",
          description: `Could not read: ${failedTables.join(", ")}. Downloaded file is missing this data.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Export ready" });
      }
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function deleteUserData() {
    if (!email.trim()) return;
    if (!confirm(`Permanently delete all platform data for user ${email}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const userId = email.trim();
      const failedTables: string[] = [];
      for (const t of EXPORT_TABLES) {
        const { error } = await supabase.from(t as any).delete().eq("user_id", userId);
        if (error) failedTables.push(`${t} (${error.message})`);
      }
      if (failedTables.length) {
        toast({
          title: "Erasure incomplete — data remains in some tables",
          description: `Failed: ${failedTables.join("; ")}. Do not report this erasure as complete until resolved.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "User data deleted", description: "Auth account must be removed separately." });
      }
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileJson className="h-5 w-5" /> GDPR Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter a user_id (UUID) to export or delete all personal data across the platform.
        </p>
        <Input placeholder="User ID (UUID)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="flex gap-2">
          <Button onClick={exportUser} disabled={!email || busy}>
            <Download className="h-4 w-4 mr-2" /> Export Data (JSON)
          </Button>
          <Button variant="destructive" onClick={deleteUserData} disabled={!email || busy}>
            <UserX className="h-4 w-4 mr-2" /> Erase Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}