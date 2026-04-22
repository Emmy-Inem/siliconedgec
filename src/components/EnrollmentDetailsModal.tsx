import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const schema = z.object({
  whatsapp_number: z.string().trim().min(7).max(20),
  country: z.string().trim().min(2).max(60),
  profession: z.string().trim().max(100).optional(),
  goal: z.string().trim().max(500).optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  courseTitle: string;
}

export function EnrollmentDetailsModal({ open, onOpenChange, courseId, courseTitle }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ whatsapp_number: "", country: "", profession: "", goal: "" });

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check the form", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase.from("course_registrations") as any).insert({
        course_id: courseId,
        user_id: user?.id ?? null,
        registration_type: "enrollment",
        full_name: user?.user_metadata?.full_name ?? user?.email ?? "Student",
        email: user?.email ?? "",
        ...parsed.data,
      });
      if (error) throw error;
      toast({ title: "Thanks!", description: "We'll reach out via WhatsApp with onboarding details." });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Couldn't save details", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">A few quick details</DialogTitle>
          <DialogDescription>Help us tailor your onboarding for {courseTitle}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>WhatsApp number *</Label>
            <Input value={form.whatsapp_number} onChange={(e) => update("whatsapp_number", e.target.value)} placeholder="+234 800 000 0000" />
          </div>
          <div>
            <Label>Country *</Label>
            <Input value={form.country} onChange={(e) => update("country", e.target.value)} placeholder="Nigeria" />
          </div>
          <div>
            <Label>Profession</Label>
            <Input value={form.profession} onChange={(e) => update("profession", e.target.value)} placeholder="Engineer / Student" />
          </div>
          <div>
            <Label>Your goal with this course</Label>
            <Textarea rows={3} value={form.goal} onChange={(e) => update("goal", e.target.value)} maxLength={500} />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save & Continue
          </Button>
          <button onClick={() => onOpenChange(false)} className="w-full text-xs text-muted-foreground hover:text-foreground">
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}