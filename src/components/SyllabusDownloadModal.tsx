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
  BookOpen, 
  Download, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  ShieldCheck, 
  Calendar 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SyllabusDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  courseId: string;
  modulesCount?: number;
  duration?: string;
}

export function SyllabusDownloadModal({
  isOpen,
  onClose,
  courseTitle,
  courseId,
  modulesCount = 6,
  duration = "8–12 Weeks",
}: SyllabusDownloadModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("newsletter-subscribe", {
        body: {
          email: email.trim(),
          full_name: name.trim() || undefined,
          source: `syllabus-${courseId.slice(0, 16)}`,
        },
      });
      if (error) throw error;
      setDownloaded(true);
      toast({
        title: "Syllabus Requested",
        description: "Your syllabus request has been processed. Download below or check your email.",
      });
    } catch (err: any) {
      toast({
        title: "Could not process request",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setDownloaded(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleReset(); }}>
      <DialogContent className="sm:max-w-md bg-card border-border/80 p-6">
        <DialogHeader className="space-y-1 text-left">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-2">
            <BookOpen className="h-5 w-5" />
          </div>
          <DialogTitle className="font-heading text-xl font-bold">
            Download Course Syllabus
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Complete module breakdown, weekly hands-on labs, and prerequisites for <strong className="text-foreground">{courseTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        {!downloaded ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Highlights pill */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 text-foreground font-medium">
                <FileText className="h-3.5 w-3.5 text-primary" /> {modulesCount} Core Modules
              </div>
              <span>•</span>
              <div className="flex items-center gap-1 text-foreground font-medium">
                <Calendar className="h-3.5 w-3.5 text-primary" /> {duration}
              </div>
              <span>•</span>
              <div className="flex items-center gap-1 text-foreground font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified Cert
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Your Full Name</label>
              <Input
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 text-sm bg-background border-border/80"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Email Address</label>
              <Input
                type="email"
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 text-sm bg-background border-border/80"
              />
              <p className="text-[11px] text-muted-foreground">
                We'll email you the complete curriculum guide and cohort start dates.
              </p>
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-10 font-medium">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Preparing Syllabus...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" /> Access Full Syllabus
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="pt-3 space-y-4 text-left">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Syllabus Guide Prepared!</p>
                <p className="text-muted-foreground mt-0.5">
                  A copy of the complete course outline and lab schedule has been sent to <strong>{email}</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2 text-xs">
              <div className="font-semibold text-foreground">Included in this syllabus:</div>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Detailed module-by-module breakdown</li>
                <li>Cloud architecture lab blueprints (Azure / AWS)</li>
                <li>Required tools, accounts, and hardware specs</li>
                <li>Capstone project milestones and grading criteria</li>
              </ul>
            </div>

            <Button onClick={handleReset} variant="outline" className="w-full text-xs">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
