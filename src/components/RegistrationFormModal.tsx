import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, MessageCircle, LayoutDashboard, LogIn } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { logUserActivity } from "@/lib/user-activity";
import { trackLead } from "@/lib/track-lead";
import { recordInfluencerConversion } from "@/lib/influencer-attribution";
import { googleAdsConversion, setGoogleAdsUserData, tikTokEvent, metaEvent } from "@/lib/analytics";

const DEFAULT_WHATSAPP_COMMUNITY = "https://chat.whatsapp.com/Fk8RN2yDKS800vnIG8K98X?mode=gi_t";

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: settings } = useSiteSettings();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
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

  // Re-sync email from auth when modal opens (in case the user signed in mid-flow).
  useEffect(() => {
    if (open && user?.email && !form.email) {
      setForm((p) => ({ ...p, email: user.email ?? "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.email]);

  const whatsappUrl = (settings as any)?.whatsapp_community_url || DEFAULT_WHATSAPP_COMMUNITY;

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!user?.id) {
      // Should not happen — the modal short-circuits to a sign-in prompt below.
      navigate(`/sign-in?next=/courses/${courseId}`);
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Check the form", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Pre-flight: is this user already registered for this webinar?
      const { data: existingReg } = await (supabase.from("course_registrations") as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .eq("registration_type", "webinar")
        .maybeSingle();

      let registrationId: string | null = existingReg?.id ?? null;

      if (existingReg) {
        // Don't write a duplicate; just show the success state.
        setAlreadyRegistered(true);
      } else {
        const { data: inserted, error } = await (supabase.from("course_registrations") as any)
          .insert({
            course_id: courseId,
            user_id: user.id,
            registration_type: "webinar",
            ...parsed.data,
          })
          .select("id")
          .single();
        if (error) {
          // Race condition: unique index already created a row — treat as success
          if ((error as any)?.code === "23505") {
            setAlreadyRegistered(true);
          } else {
            throw error;
          }
        } else {
          registrationId = inserted?.id ?? null;
        }
      }

      // Ensure an enrollment exists so the course shows on the dashboard.
      const { data: existingEnroll } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      if (!existingEnroll) {
        const { error: enrollErr } = await supabase.from("enrollments").insert({
          user_id: user.id,
          course_id: courseId,
          payment_status: "free",
        });
        // Surface enrollment errors (other than unique-constraint races)
        if (enrollErr && (enrollErr as any)?.code !== "23505") {
          throw enrollErr;
        }
      }

      // Track activity & lead source
      await Promise.all([
        logUserActivity({
          user_id: user.id,
          action: "webinar_registration",
          entity_type: "course",
          entity_id: courseId,
          metadata: { course_title: courseTitle, email: parsed.data.email },
        }),
        trackLead({ formType: "webinar_registration", formData: { course_id: courseId, ...parsed.data } }),
        recordInfluencerConversion({
          userId: user.id,
          courseId,
          conversionType: "webinar_registration",
          registrationId,
        }),
      ]);

      // Pixel conversions — Google Ads (with enhanced conversions),
      // TikTok and Meta. We hash email + WhatsApp number so Google can
      // match the lead even when 3rd-party cookies are blocked.
      void setGoogleAdsUserData({
        email: parsed.data.email,
        phone: parsed.data.whatsapp_number,
      });
      googleAdsConversion("WebinarRegistration", {
        value: 0,
        currency: "NGN",
        content_id: courseId,
        content_name: courseTitle,
      });
      tikTokEvent("SubmitForm", {
        content_id: courseId,
        content_name: courseTitle,
        content_type: "webinar",
      });
      metaEvent("Lead", {
        content_name: courseTitle,
        content_category: "webinar",
        content_ids: [courseId],
      });

      setDone(true);
      toast({
        title: existingReg ? "You're already registered ✓" : "You're in! 🎉",
        description: existingReg
          ? `You're confirmed for ${courseTitle}. Joining link is in your email.`
          : `Confirmed for ${courseTitle}. Check your email & WhatsApp.`,
      });
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
          <DialogTitle className="font-heading">
            {done
              ? alreadyRegistered ? "You're already registered ✓" : "You're in! 🎉"
              : !user
                ? "Sign in to register"
                : `Register for ${courseTitle}`}
          </DialogTitle>
          <DialogDescription>
            {done
              ? alreadyRegistered
                ? "You're already on the list. Joining link is in your inbox & WhatsApp."
                : "We've sent the joining link and reminder details to your email and WhatsApp."
              : !user
                ? "Free webinars require a quick sign-in so we can save your spot to your dashboard."
                : "Fill in your details and we'll send the joining link to your email & WhatsApp."}
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="py-6 text-center space-y-4">
            <LogIn className="h-12 w-12 mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              Sign in (or create a free account) so we can save your spot and prevent duplicate registrations.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/sign-in?next=/courses/${courseId}`);
                }}
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/sign-up?next=/courses/${courseId}`);
                }}
              >
                Create Account
              </Button>
            </div>
          </div>
        ) : done ? (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 mx-auto text-primary" />
            <div className="space-y-1">
              <p className="font-heading font-semibold text-lg">
                {alreadyRegistered ? `You're already confirmed for ${courseTitle}` : `You're confirmed for ${courseTitle} 🎉`}
              </p>
              <p className="text-sm text-muted-foreground">
                We've sent the joining link and reminder details to your email and WhatsApp.
                Add it to your calendar so you don't miss it.
              </p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium">Join our WhatsApp community for updates, networking & support.</p>
              <Button
                asChild
                className="w-full gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white"
              >
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Join WhatsApp Community
                </a>
              </Button>
              {user && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    setDone(false);
                    setAlreadyRegistered(false);
                    onOpenChange(false);
                    navigate("/dashboard");
                  }}
                >
                  <LayoutDashboard className="h-4 w-4" /> View in Dashboard
                </Button>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setDone(false); setAlreadyRegistered(false); onOpenChange(false); }}>
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