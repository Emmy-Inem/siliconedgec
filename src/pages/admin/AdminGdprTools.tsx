import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Download, UserX, FileJson } from "lucide-react";

const EXPORT_TABLES = [
  "profiles", "enrollments", "orders", "certificates", "bookmarks",
  "lesson_progress", "lesson_notes", "lesson_comments", "reviews",
  "course_registrations", "notifications", "user_xp_events", "quiz_attempts",
];

export default function AdminGdprTools() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookupUser(): Promise<string | null> {
    const { data } = await supabase.from("profiles").select("user_id, full_name").limit(1000);
    // Match via email lookup is not available client-side; ask admin to paste user_id directly if not found.
    return null;
  }

  async function exportUser() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const userId = email.trim();
      const payload: Record<string, any> = { user_id: userId, exported_at: new Date().toISOString() };
      for (const t of EXPORT_TABLES) {
        const { data } = await supabase.from(t as any).select("*").eq("user_id", userId);
        payload[t] = data ?? [];
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `gdpr-export-${userId}.json`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export ready" });
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
      for (const t of EXPORT_TABLES) {
        await supabase.from(t as any).delete().eq("user_id", userId);
      }
      toast({ title: "User data deleted", description: "Auth account must be removed separately." });
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