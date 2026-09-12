import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  ArrowDown
} from "lucide-react";

interface BusinessLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    company_name: string;
    contact_name: string;
    job_title: string;
    email: string;
    phone: string;
    company_size: string;
    training_focus: string;
    training_needs: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  submitted: boolean;
}

export function BusinessLeadModal({ 
  isOpen, 
  onClose, 
  formData,
  onChange,
  onSubmit,
  submitting,
  submitted
}: BusinessLeadModalProps) {
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

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-muted/40 text-foreground placeholder:text-muted-foreground/70 border-border/80";

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl bg-card border-border/80 p-6 md:p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
        <DialogHeader className="space-y-1.5 text-center sm:text-left">
          <p className="font-medium text-xs tracking-[0.25em] uppercase" style={{ color: "hsl(var(--gold))" }}>
            Build a Future-Ready Team
          </p>
          <DialogTitle className="font-heading text-xl md:text-2xl font-bold text-foreground">
            Request Corporate Technology Training
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Tell us about your organisation's training needs and we'll recommend the right programme, delivery model and next steps.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-3" style={{ color: "hsl(var(--gold))" }} />
            <h3 className="font-heading text-xl font-bold text-foreground">Thank You!</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Your request has been submitted. Our team will reach out within 24 hours.
            </p>
            <div className="pt-3">
              <Button onClick={onClose} variant="outline" size="sm" className="text-xs">
                Close Window
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3.5 pt-2 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <input
                name="company_name"
                placeholder="Company Name *"
                value={formData.company_name}
                onChange={onChange}
                required
                className={inputClass}
              />
              <input
                name="contact_name"
                placeholder="Your Full Name *"
                value={formData.contact_name}
                onChange={onChange}
                required
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <input
                name="job_title"
                placeholder="Job Title *"
                value={formData.job_title}
                onChange={onChange}
                required
                className={inputClass}
              />
              <input
                name="email"
                type="email"
                placeholder="Work Email *"
                value={formData.email}
                onChange={onChange}
                required
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <input
                name="phone"
                type="tel"
                placeholder="Phone Number *"
                value={formData.phone}
                onChange={onChange}
                required
                className={inputClass}
              />
              <input
                name="company_size"
                placeholder="Team Size"
                value={formData.company_size}
                onChange={onChange}
                className={inputClass}
              />
            </div>

            <input
              name="training_focus"
              placeholder="What would you like your team to be trained in? *"
              value={formData.training_focus}
              onChange={onChange}
              required
              className={inputClass}
            />

            <textarea
              name="training_needs"
              placeholder="Tell us about your training needs"
              rows={3}
              value={formData.training_needs}
              onChange={onChange}
              className={`${inputClass} resize-none`}
            />

            <div className="pt-2 space-y-2.5">
              <Button size="lg" className="w-full text-xs font-semibold hover-scale" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Request Corporate Training Consultation <ArrowRight className="ml-2 h-4 w-4" />
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
