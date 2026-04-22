import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const schema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  whatsapp_number: z.string().trim().min(7, "WhatsApp number required").max(20),
  country: z.string().trim().min(2, "Country required").max(60),
  profession: z.string().trim().max(100).optional(),
  experience_level: z.string().max(40).optional(),
  how_did_you_hear: z.string().max(60).optional(),
  motivation: z.string().max(500).optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  courseTitle: string;
  onSuccess?: () => void;
}

export function RegistrationFormModal({ open, onOpenChange, courseId, courseTitle, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useSiteSettings();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: user?.email ?? "",
    whatsapp_number: "",
    country: "",
    profession: "",
    experience_level: "",
    how_did_you_hear: "",
    motivation: "",
  });

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
        registration_type: "webinar",
        ...parsed.data,
      });
      if (error) throw error;

      // Auto-create enrollment so user can see it on dashboard
      if (user?.id) {
        await supabase.from("enrollments").insert({
          user_id: user.id,
          course_id: courseId,
          payment_status: "free",
        });
      }

      setDone(true);
      toast({ title: "Registration confirmed", description: `You're registered for ${courseTitle}.` });
      onSuccess?.();
      // Don't auto-close — let user click WhatsApp CTA
    } catch (e: any) {
      toast({ title: "Couldn't register", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Register for {courseTitle}</DialogTitle>
          <DialogDescription>Fill in your details and we'll send the joining link to your email & WhatsApp.</DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 mx-auto text-primary" />
            <div className="space-y-1">
              <p className="font-heading font-semibold text-lg">You're registered! 🎉</p>
              <p className="text-sm text-muted-foreground">Check your email & WhatsApp for the joining link.</p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium">Join our WhatsApp community for updates, networking & support.</p>
              <Button
                asChild
                className="w-full gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white"
              >
                <a
                  href={(settings as any)?.whatsapp_community_url || "https://chat.whatsapp.com/"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Join WhatsApp Community
                </a>
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setDone(false); onOpenChange(false); }}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Full name *</Label>
                <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Jane Doe" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@email.com" />
              </div>
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
                <Input value={form.profession} onChange={(e) => update("profession", e.target.value)} placeholder="Student / Engineer / etc." />
              </div>
              <div>
                <Label>Experience level</Label>
                <Select value={form.experience_level} onValueChange={(v) => update("experience_level", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>How did you hear about us?</Label>
              <Select value={form.how_did_you_hear} onValueChange={(v) => update("how_did_you_hear", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Google">Google search</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Friend">Friend / Referral</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>What do you hope to learn? (optional)</Label>
              <Textarea rows={3} value={form.motivation} onChange={(e) => update("motivation", e.target.value)} maxLength={500} />
            </div>
            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Registration
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}