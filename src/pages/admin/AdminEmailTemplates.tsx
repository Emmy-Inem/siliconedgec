import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { FileText, Save, Loader2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const TEMPLATES = [
  { key: "tpl_welcome", label: "Welcome Email", defaults: { subject: "Welcome to Silicon Edge!", body: "Hi {{name}},\n\nWelcome aboard! Start exploring courses at {{site_url}}/courses." } },
  { key: "tpl_enrollment", label: "Enrollment Confirmation", defaults: { subject: "You're enrolled in {{course_title}}", body: "Hi {{name}},\n\nYour enrollment is confirmed. Begin learning here: {{course_url}}." } },
  { key: "tpl_certificate", label: "Certificate Issued", defaults: { subject: "🎓 Certificate ready: {{course_title}}", body: "Congratulations {{name}}!\n\nVerify your certificate: {{verify_url}}." } },
  { key: "tpl_reset", label: "Password Reset", defaults: { subject: "Reset your password", body: "Hi {{name}},\n\nClick to reset your password: {{reset_url}}. This expires in 1 hour." } },
  { key: "tpl_cart_recovery", label: "Cart Recovery", defaults: { subject: "Your cart is waiting", body: "Hi {{name}},\n\nYou left items in your cart. Complete your purchase: {{cart_url}}." } },
];

export default function AdminEmailTemplates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [active, setActive] = useState(TEMPLATES[0].key);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => (await supabase.from("site_content").select("*").like("key", "tpl_%")).data ?? [],
  });

  useEffect(() => {
    const tpl = TEMPLATES.find((t) => t.key === active)!;
    const subjectRow = rows.find((r: any) => r.key === `${active}_subject`);
    const bodyRow = rows.find((r: any) => r.key === active);
    setSubject(subjectRow?.value ?? tpl.defaults.subject);
    setBody(bodyRow?.value ?? tpl.defaults.body);
  }, [active, rows]);

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from("site_content").upsert({ key: `${active}_subject`, value: subject, content_type: "email_subject" }, { onConflict: "key" });
      await supabase.from("site_content").upsert({ key: active, value: body, content_type: "email_body" }, { onConflict: "key" });
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Template updated." });
      qc.invalidateQueries({ queryKey: ["email-templates"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const tpl = TEMPLATES.find((t) => t.key === active)!;
  const preview = body
    .replace(/{{name}}/g, "John Doe")
    .replace(/{{site_url}}/g, "https://siliconedgec.com")
    .replace(/{{course_title}}/g, "AI Foundations")
    .replace(/{{course_url}}/g, "https://siliconedgec.com/courses/ai")
    .replace(/{{verify_url}}/g, "https://siliconedgec.com/verify/ABC123")
    .replace(/{{reset_url}}/g, "https://siliconedgec.com/reset?token=...")
    .replace(/{{cart_url}}/g, "https://siliconedgec.com/cart");

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Email Templates</h1>
          <p className="text-sm text-muted-foreground">Edit transactional email content. Variables: {"{{name}}"}, {"{{course_title}}"}, etc.</p>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr_360px]">
        <Card>
          <CardContent className="p-2 space-y-1">
            {TEMPLATES.map((t) => (
              <button key={t.key} onClick={() => setActive(t.key)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${active === t.key ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}>
                {t.label}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold">{tpl.label}</h2>
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save
              </Button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Body</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="font-mono text-xs" disabled={isLoading} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-heading text-sm font-semibold mb-2 flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Preview</h3>
            <div className="border border-border rounded-md p-3 bg-muted/30 space-y-2">
              <p className="text-xs font-semibold border-b border-border pb-1.5">{subject.replace(/{{name}}/g, "John Doe").replace(/{{course_title}}/g, "AI Foundations")}</p>
              <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground font-sans">{preview}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}