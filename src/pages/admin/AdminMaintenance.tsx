import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Wrench } from "lucide-react";

const KEY = "maintenance_mode";

export default function AdminMaintenance() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("We're performing scheduled maintenance. Back shortly.");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", KEY).maybeSingle();
      if (data?.value) {
        try {
          const v = JSON.parse(data.value as any);
          setEnabled(!!v.enabled);
          setMessage(v.message || message);
        } catch {}
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    const value = JSON.stringify({ enabled, message });
    const { data: existing } = await supabase.from("site_content").select("id").eq("key", KEY).maybeSingle();
    if (existing) {
      await supabase.from("site_content").update({ value, content_type: "json" }).eq("id", existing.id);
    } else {
      await supabase.from("site_content").insert({ key: KEY, value, content_type: "json" });
    }
    toast({ title: "Saved" });
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Maintenance Mode</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="maint">Enable maintenance banner</Label>
          <Switch id="maint" checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
        </div>
        <Button onClick={save}>Save</Button>
      </CardContent>
    </Card>
  );
}