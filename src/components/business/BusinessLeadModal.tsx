import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  Sparkles,
  ArrowDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BusinessLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BusinessLeadModal({ isOpen, onClose, onSuccess }: BusinessLeadModalProps) {
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    job_title: "",
    email: "",
    phone: "",
    company_size: "",
    training_focus: "",
    training_needs: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const trackLinkedInConversion = () => {
    try {
      const w = window as any;
      if (w.lintrk) {
        w.lintrk("track", { conversion_id: 30673009 });
      }
    } catch (e) {
      console.warn("LinkedIn conversion tracking failed", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = [
      "company_name",
      "contact_name",
      "job_title",
      "email",
      "phone",
      "training_focus",
    ] as const;

    const missing = required.filter((k) => !formData[k].trim());
    if (missing.length) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const payload = {
      company_name: formData.company_name.trim(),
      contact_name: formData.contact_name.trim(),
      job_title: formData.job_title.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      company_size: formData.company_size.trim() || null,
      training_needs: [formData.training_focus.trim(), formData.training_needs.trim()].filter(Boolean).join("\n\n"),
    };

    const { data: inserted, error } = await (supabase.from("business_leads") as any)
      .insert(payload)
      .select("id")
      .single();

    if (!error && inserted?.id) {
      try {
        await supabase.functions.invoke("notify-business-lead", {
          body: {
            lead_id: inserted.id,
            ...payload,
          },
        });
      } catch (e) {
        console.warn("notify-business-lead failed", e);
      }
    }

    setSubmitting(false);

    if (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later or email info@siliconedgec.com directly.",
        variant: "destructive",
      });
    } else {
      setSubmitted(true);
      trackLinkedInConversion();
      onSuccess?.();
      toast({
        title: "Consultation Request Received",
        description: "Our corporate team will review your requirements and reach out within 24 hours.",
      });
    }
  };

  const handleScrollToForm = () => {
    onClose();
    setTimeout(() => {
      const el = document.getElementById("contact-form");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        const firstInput = el.querySelector("input");
        firstInput?.focus();
      }
    }, 150);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg bg-card border-border/80 p-6 md:p-7 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Building2 className="h-3.5 w-3.5" />
              <span>Corporate Training Consultation</span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
              Silicon Edge B2B
            </span>
          </div>

          <DialogTitle className="font-heading text-xl md:text-2xl font-bold text-foreground pt-1">
            Accelerate Your Engineering Team's Capability
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Upskill your team in Cloud Engineering (Azure/AWS), DevOps, or AI. Complete this quick request to receive a tailored corporate syllabus and enterprise quote.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Request Successfully Submitted!
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Thank you, <strong>{formData.contact_name}</strong>. Our enterprise team is preparing a customized training proposal for <strong>{formData.company_name}</strong>.
              </p>
            </div>
            <div className="pt-2">
              <Button onClick={onClose} variant="outline" size="sm" className="text-xs">
                Close Window
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            {/* Value chips */}
            <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1 text-foreground font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">Live Cloud Labs</span>
              </div>
              <div className="flex items-center gap-1 text-foreground font-medium">
                <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">Custom Cohorts</span>
              </div>
              <div className="flex items-center gap-1 text-foreground font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">Fast Proposal</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Company Name *</label>
                <Input
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Corp"
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Contact Full Name *</label>
                <Input
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  placeholder="e.g. Sarah Jenkins"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Job Title *</label>
                <Input
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  placeholder="e.g. VP of Engineering, HR Lead"
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Work Email *</label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Phone Number *</label>
                <Input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+44 7... or +234..."
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Team Size</label>
                <select
                  name="company_size"
                  value={formData.company_size}
                  onChange={handleChange}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select team size...</option>
                  <option value="5-15">5–15 learners (Team Sprint)</option>
                  <option value="15-60">15–60 learners (Department Rollout)</option>
                  <option value="60+">60+ learners (Enterprise Academy)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Target Training Focus *
              </label>
              <Input
                name="training_focus"
                value={formData.training_focus}
                onChange={handleChange}
                placeholder="e.g. Microsoft Azure Architecture, DevOps & Kubernetes, AI"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Additional Notes / Objectives (Optional)
              </label>
              <textarea
                name="training_needs"
                value={formData.training_needs}
                onChange={handleChange}
                rows={2}
                placeholder="Specific timelines, tech stack, or cohort objectives..."
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="pt-2 space-y-2">
              <Button type="submit" disabled={submitting} className="w-full h-10 text-xs font-medium gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting Request...
                  </>
                ) : (
                  <>
                    Request Corporate Training Quote <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleScrollToForm}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  <ArrowDown className="h-3 w-3" /> Scroll to full page form instead
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
