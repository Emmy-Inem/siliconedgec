import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { FileText, Save, Loader2, Eye, RotateCcw, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const TEMPLATES = [
  { key: "tpl_welcome", label: "Welcome Email", defaults: { subject: "Welcome to Silicon Edge!", body: "Hi {{name}},\n\nWelcome aboard! Start exploring courses at {{site_url}}/courses.\n\n— The Silicon Edge Team" } },
  { key: "tpl_enrollment", label: "Enrollment Confirmation", defaults: { subject: "You're enrolled in {{course_title}}", body: "Hi {{name}},\n\nYour enrollment is confirmed. Begin learning here: {{course_url}}.\n\nGood luck!" } },
  { key: "tpl_certificate", label: "Certificate Issued", defaults: { subject: "🎓 Certificate ready: {{course_title}}", body: "Congratulations {{name}}!\n\nYou've successfully completed {{course_title}}.\n\nVerify your certificate: {{verify_url}}." } },
  { key: "tpl_reset", label: "Password Reset", defaults: { subject: "Reset your password", body: "Hi {{name}},\n\nClick the link to reset your password: {{reset_url}}.\n\nThis link expires in 1 hour. If you didn't request this, ignore this email." } },
  { key: "tpl_cart_recovery", label: "Cart Recovery", defaults: { subject: "Your cart is waiting", body: "Hi {{name}},\n\nYou left items in your cart. Complete your purchase: {{cart_url}}.\n\nDon't miss out on advancing your skills!" } },
];

const VARIABLES = [
  { token: "{{name}}", sample: "John Doe" },
  { token: "{{site_url}}", sample: "https://siliconedgec.com" },
  { token: "{{course_title}}", sample: "AI Foundations" },
  { token: "{{course_url}}", sample: "https://siliconedgec.com/dashboard" },
  { token: "{{verify_url}}", sample: "https://siliconedgec.com/verify/ABC123" },
  { token: "{{reset_url}}", sample: "https://siliconedgec.com/reset?token=..." },
  { token: "{{cart_url}}", sample: "https://siliconedgec.com/cart" },
];

function applyVars(s: string) {
  let out = s;
  for (const { token, sample } of VARIABLES) {
    out = out.split(token).join(sample);
  }
  return out;
}

function buildPreviewHtml(subject: string, body: string) {
  const renderedBody = applyVars(body)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  const renderedSubject = applyVars(subject)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    body{margin:0;padding:24px;background:#f3f4f6;font-family:system-ui,-apple-system,sans-serif;}
    .card{max-width:560px;margin:0 auto;padding:28px;background:#0f172a;color:#fff;border-radius:14px;line-height:1.55;font-size:14px;}
    .subj{font-weight:600;font-size:13px;color:#a78bfa;letter-spacing:.4px;text-transform:uppercase;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:12px;}
    .cta{display:inline-block;margin-top:18px;padding:10px 20px;background:#b13bff;color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;}
    .footer{margin-top:24px;padding-top:14px;border-top:1px solid #1e293b;font-size:11px;color:#64748b;}
  </style></head><body>
    <div class="card">
      <div class="subj">${renderedSubject}</div>
      <div>${renderedBody}</div>
      <div class="footer">Silicon Edge Consulting · Job-Ready Tech Training</div>
    </div>
  </body></html>`;
}

function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminEmailTemplates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [active, setActive] = useState(TEMPLATES[0].key);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tick, setTick] = useState(0);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => (await supabase.from("site_content").select("*").like("key", "tpl_%")).data ?? [],
  });

  const tpl = useMemo(() => TEMPLATES.find((t) => t.key === active)!, [active]);
  const subjectRow = rows.find((r: any) => r.key === `${active}_subject`);
  const bodyRow = rows.find((r: any) => r.key === active);
  const lastSavedAt = bodyRow?.updated_at ? new Date(bodyRow.updated_at) : null;

  useEffect(() => {
    setSubject(subjectRow?.value ?? tpl.defaults.subject);
    setBody(bodyRow?.value ?? tpl.defaults.body);
  }, [active, rows]);

  // refresh "saved Xs ago" label
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      if (!subject.trim()) throw new Error("Subject cannot be empty");
      if (!body.trim()) throw new Error("Body cannot be empty");
      const { error } = await supabase.from("site_content").upsert(
        [
          { key: `${active}_subject`, value: subject, content_type: "email_subject" },
          { key: active, value: body, content_type: "email_body" },
        ],
        { onConflict: "key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Template updated successfully." });
      qc.invalidateQueries({ queryKey: ["email-templates"] });
    },
    onError: (e: any) => toast({ title: "Validation error", description: e.message, variant: "destructive" }),
  });

  const resetToDefaults = () => {
    setSubject(tpl.defaults.subject);
    setBody(tpl.defaults.body);
    toast({ title: "Reset", description: "Reverted to defaults — click Save to persist." });
  };

  const previewHtml = useMemo(() => buildPreviewHtml(subject, body), [subject, body]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Email Templates</h1>
          <p className="text-sm text-muted-foreground">Edit transactional email content. Available variables: {VARIABLES.map((v) => v.token).join(", ")}</p>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_400px]">
        <Card>
          <CardContent className="p-2 space-y-1">
            {isLoading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
            ) : (
              TEMPLATES.map((t) => {
                const hasCustom = rows.some((r: any) => r.key === t.key || r.key === `${t.key}_subject`);
                return (
                  <button
                    key={t.key}
                    onClick={() => setActive(t.key)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between gap-2 ${
                      active === t.key ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="truncate">{t.label}</span>
                    {hasCustom && <Check className="h-3 w-3 shrink-0 text-primary/70" />}
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-0.5">
                <h2 className="font-heading text-sm font-semibold">{tpl.label}</h2>
                {lastSavedAt && (
                  <p className="text-[10px] text-muted-foreground">Last saved {timeAgo(lastSavedAt)}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={resetToDefaults} disabled={isLoading}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                </Button>
                <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || isLoading}>
                  {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-56 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Subject</label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Body</label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="font-mono text-xs" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-heading text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Live preview
            </h3>
            {isLoading ? (
              <Skeleton className="h-[420px] w-full" />
            ) : (
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewHtml}
                className="w-full h-[420px] rounded-md border border-border bg-muted/30"
              />
            )}
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              Variables auto-replaced with sample values. Final emails use the same wrapper shown here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}