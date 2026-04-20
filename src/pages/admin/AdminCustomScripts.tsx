import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Code, Save, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const KEYS = ["custom_head_script", "custom_body_script"] as const;

export default function AdminCustomScripts() {
  const [head, setHead] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_content").select("key,value").in("key", KEYS as unknown as string[]);
      data?.forEach(r => {
        if (r.key === "custom_head_script") setHead(r.value || "");
        if (r.key === "custom_body_script") setBody(r.value || "");
      });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const upserts = [
      { key: "custom_head_script", value: head, content_type: "html" },
      { key: "custom_body_script", value: body, content_type: "html" },
    ];
    for (const row of upserts) {
      const { data: existing } = await supabase.from("site_content").select("id").eq("key", row.key).maybeSingle();
      if (existing) {
        await supabase.from("site_content").update({ value: row.value, content_type: row.content_type }).eq("id", existing.id);
      } else {
        await supabase.from("site_content").insert(row);
      }
    }
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    toast({ title: "Saved", description: "Scripts will load on next page refresh." });
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Code className="h-6 w-6 text-primary" /> Custom Scripts</h1>
        <p className="text-sm text-muted-foreground mt-1">Inject tracking pixels, analytics, or custom code site-wide without touching the codebase.</p>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex gap-3 items-start text-sm">
        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-yellow-800 dark:text-yellow-300">Security warning</p>
          <p className="text-muted-foreground mt-1">Only paste scripts from trusted sources. Malicious code added here will execute for every visitor.</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Head scripts (loaded in &lt;head&gt;)</label>
        <textarea
          value={head}
          onChange={e => setHead(e.target.value)}
          rows={10}
          placeholder='<!-- e.g. Meta Pixel, Hotjar, custom GA -->&#10;<script>...</script>'
          className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono text-xs"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Body scripts (loaded at end of &lt;body&gt;)</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={10}
          placeholder='<!-- e.g. chat widgets, deferred trackers -->&#10;<script>...</script>'
          className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono text-xs"
        />
      </div>

      <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save scripts"}</Button>
    </div>
  );
}
