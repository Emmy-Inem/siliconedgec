import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";
import { newSubmissionKey, submitEnquiry, trackLeadOnce } from "@/lib/enquiry";

export const COHORT_START_ISO = "2026-11-28";
const DRAFT_KEY = "sec_course_enquiry_draft";
const PHONE_RE = /^\+[1-9][0-9 ()-]{6,19}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Form = {
  name: string; email: string; phone: string; country: string;
  experience: "" | "beginner" | "it_professional" | "other";
  start: "" | "2026-11-28" | "later_cohort" | "exploring";
  question: string; website: string;
};
const EMPTY: Form = { name: "", email: "", phone: "", country: "", experience: "", start: "", question: "", website: "" };

function loadDraft(): Form {
  try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}"), website: "" }; } catch { return EMPTY; }
}

export function validateEnquiry(f: Form): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {};
  if (!f.name.trim()) e.name = "Please enter your name.";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Please enter a valid email address.";
  if (!PHONE_RE.test(f.phone.trim())) e.phone = "Use international format starting with +, e.g. +234 801 234 5678.";
  if (f.country.trim().length < 2) e.country = "Please enter your country.";
  if (!f.experience) e.experience = "Please choose your experience level.";
  if (!f.start) e.start = "Please choose when you'd like to start.";
  if (f.question.length > 1000) e.question = "Please keep your question under 1000 characters.";
  return e;
}

interface Props { open: boolean; onOpenChange: (o: boolean) => void; courseId: string; courseTitle: string; }

export function CourseEnquiryDialog({ open, onOpenChange, courseId, courseTitle }: Props) {
  const [form, setForm] = useState<Form>(loadDraft);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [serverError, setServerError] = useState("");
  const keyRef = useRef(newSubmissionKey());
  const sendingRef = useRef(false);

  // Keep unsent answers if the page has to reload.
  useEffect(() => {
    if (status === "done") return;
    const { website, ...rest } = form;
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(rest)); } catch { /* ignore */ }
  }, [form, status]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (sendingRef.current) return;
    setServerError("");
    if (form.website) { setStatus("done"); return; } // spam trap: silently ignore bots
    const errs = validateEnquiry(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(`ce-${first}`)?.focus();
      return;
    }
    sendingRef.current = true;
    setStatus("sending");
    try {
      const res = await submitEnquiry("course", {
        contact_name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        country: form.country.trim(), experience_level: form.experience, intended_start: form.start,
        message: form.question.trim() || null, course_id: courseId, training_needs: `Course enquiry: ${courseTitle}`,
      }, keyRef.current);
      trackLeadOnce(res, "course_enquiry");
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setForm(EMPTY);
      keyRef.current = newSubmissionKey();
      setStatus("done");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("idle");
    } finally {
      sendingRef.current = false;
    }
  };

  const err = (k: keyof Form) => errors[k] ? (
    <p id={`ce-${k}-err`} role="alert" className="text-xs text-destructive mt-1">{errors[k]}</p>
  ) : null;
  const aria = (k: keyof Form) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `ce-${k}-err` : undefined });
  const selectCls = "flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o && status === "done") setStatus("idle"); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[calc(100vw-1.5rem)] sm:w-full">
        {status === "done" ? (
          <div className="py-6 text-center space-y-3" role="status">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <DialogTitle>Thanks — your enquiry is saved</DialogTitle>
            <DialogDescription>Our team will reply by email about the 28 November cohort.</DialogDescription>
            <Button onClick={() => onOpenChange(false)} className="mt-2">Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Ask about the 28 November cohort</DialogTitle>
              <DialogDescription>{courseTitle}. Starts 28 November 2026 · 4 weeks · 32 hours, live online. Ask us for class times.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} noValidate className="space-y-4">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 opacity-0" value={form.website} onChange={(e) => set("website", e.target.value)} />
              <div><Label htmlFor="ce-name">Full name *</Label>
                <Input id="ce-name" className="h-11" autoComplete="name" maxLength={120} value={form.name} onChange={(e) => set("name", e.target.value)} {...aria("name")} />{err("name")}</div>
              <div><Label htmlFor="ce-email">Email *</Label>
                <Input id="ce-email" type="email" className="h-11" autoComplete="email" maxLength={255} value={form.email} onChange={(e) => set("email", e.target.value)} {...aria("email")} />{err("email")}</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="ce-phone">Phone (international) *</Label>
                  <Input id="ce-phone" type="tel" className="h-11" autoComplete="tel" placeholder="+234 801 234 5678" maxLength={24} value={form.phone} onChange={(e) => set("phone", e.target.value)} {...aria("phone")} />{err("phone")}</div>
                <div><Label htmlFor="ce-country">Country *</Label>
                  <Input id="ce-country" className="h-11" autoComplete="country-name" maxLength={80} value={form.country} onChange={(e) => set("country", e.target.value)} {...aria("country")} />{err("country")}</div>
              </div>
              <div><Label htmlFor="ce-experience">Experience level *</Label>
                <select id="ce-experience" className={selectCls} value={form.experience} onChange={(e) => set("experience", e.target.value as Form["experience"])} {...aria("experience")}>
                  <option value="">Choose one</option>
                  <option value="beginner">Beginner / career changer</option>
                  <option value="it_professional">IT professional</option>
                  <option value="other">Other</option>
                </select>{err("experience")}</div>
              <div><Label htmlFor="ce-start">When would you like to start? *</Label>
                <select id="ce-start" className={selectCls} value={form.start} onChange={(e) => set("start", e.target.value as Form["start"])} {...aria("start")}>
                  <option value="">Choose one</option>
                  <option value="2026-11-28">28 November 2026</option>
                  <option value="later_cohort">A later cohort</option>
                  <option value="exploring">Just exploring</option>
                </select>{err("start")}</div>
              <div><Label htmlFor="ce-question">Your question (optional)</Label>
                <Textarea id="ce-question" rows={3} maxLength={1000} value={form.question} onChange={(e) => set("question", e.target.value)} {...aria("question")} />{err("question")}</div>
              {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={status === "sending"}>
                {status === "sending" ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending…</> : "Send enquiry"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">No account needed. We only use these details to reply to you.</p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
