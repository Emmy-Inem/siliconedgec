import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useJob } from "@/hooks/useJobs";
import { Briefcase, MapPin, Clock, Wifi, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";
import { motion } from "framer-motion";
import { Upload, Loader2, FileText } from "lucide-react";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showApply, setShowApply] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resumeName, setResumeName] = useState<string>("");
  const [form, setForm] = useState({ full_name: "", email: user?.email || "", phone: "", cover_letter: "", resume_url: "" });
  const { format: formatPrice } = useLocalizedPrice();

  const handleResumeUpload = async (file: File) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to upload a resume.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("job-resumes").upload(path, file, {
      upsert: false,
      cacheControl: "3600",
    });
    if (error) {
      setUploading(false);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    // Generate a long-lived signed URL (7 days) so admins can review
    const { data: signed } = await supabase.storage.from("job-resumes").createSignedUrl(path, 60 * 60 * 24 * 7);
    setForm((f) => ({ ...f, resume_url: signed?.signedUrl ?? path }));
    setResumeName(file.name);
    setUploading(false);
    toast({ title: "Resume uploaded" });
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!job) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-32 pb-20 text-center">
        <p className="text-muted-foreground">Job not found.</p>
        <Link to="/jobs" className="text-primary hover:underline mt-4 inline-block">← Back to jobs</Link>
      </div>
      <Footer />
    </div>
  );

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to apply." });
      navigate("/sign-in");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("job_applications").insert({
      job_id: job.id,
      user_id: user.id,
      ...form,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Application failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Application submitted!", description: "We'll be in touch soon." });
      setShowApply(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${job.title} at ${job.company} | Jobs`}
        description={job.description.slice(0, 155)}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: job.title,
          description: job.description,
          datePosted: (job as any).created_at ?? new Date().toISOString(),
          employmentType: job.job_type,
          hiringOrganization: {
            "@type": "Organization",
            name: job.company,
            sameAs: "https://siliconedgec.com",
          },
          jobLocationType: job.is_remote ? "TELECOMMUTE" : undefined,
          jobLocation: job.location
            ? {
                "@type": "Place",
                address: { "@type": "PostalAddress", addressLocality: job.location },
              }
            : undefined,
          baseSalary:
            job.salary_min || job.salary_max
              ? {
                  "@type": "MonetaryAmount",
                  currency: "NGN",
                  value: {
                    "@type": "QuantitativeValue",
                    minValue: job.salary_min ? Number(job.salary_min) : undefined,
                    maxValue: job.salary_max ? Number(job.salary_max) : undefined,
                    unitText: "YEAR",
                  },
                }
              : undefined,
        }}
      />
      <Header />

      <section className="pt-28 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to jobs
          </Link>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-8">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
              <div>
                <h1 className="font-heading text-3xl font-bold">{job.title}</h1>
                <p className="text-muted-foreground mt-1">{job.company}</p>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-3">
                  {job.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>}
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {job.job_type}</span>
                  {job.is_remote && <span className="flex items-center gap-1 text-primary"><Wifi className="h-3.5 w-3.5" /> Remote</span>}
                </div>
                {(job.salary_min || job.salary_max) && (
                  <p className="text-lg font-heading font-semibold mt-3 text-gold">
                    {job.salary_min ? formatPrice(Number(job.salary_min)) : ""}
                    {job.salary_min && job.salary_max ? " – " : ""}
                    {job.salary_max ? formatPrice(Number(job.salary_max)) : ""}
                  </p>
                )}
              </div>
              <Button size="lg" onClick={() => setShowApply(true)}>
                <Send className="h-4 w-4 mr-2" /> Apply Now
              </Button>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
              <h3 className="font-heading font-semibold text-lg mb-2">About the role</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">{job.description}</p>

              {job.requirements && (
                <>
                  <h3 className="font-heading font-semibold text-lg mt-6 mb-2">Requirements</h3>
                  <p className="whitespace-pre-wrap text-muted-foreground">{job.requirements}</p>
                </>
              )}

              {job.benefits && (
                <>
                  <h3 className="font-heading font-semibold text-lg mt-6 mb-2">Benefits</h3>
                  <p className="whitespace-pre-wrap text-muted-foreground">{job.benefits}</p>
                </>
              )}
            </div>
          </motion.div>

          {showApply && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4">
              <div className="bg-card rounded-2xl border border-border max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="font-heading text-xl font-bold mb-4">Apply: {job.title}</h3>
                <form onSubmit={handleApply} className="space-y-3">
                  <input required placeholder="Full name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  <input placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Resume (PDF, DOC, max 5 MB)</label>
                    <input
                      id="resume-file"
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleResumeUpload(e.target.files[0])}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => document.getElementById("resume-file")?.click()}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm hover:border-primary/40"
                      >
                        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {uploading ? "Uploading…" : resumeName ? "Replace file" : "Upload resume"}
                      </button>
                      {resumeName && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <FileText className="h-3 w-3" /> {resumeName}
                        </span>
                      )}
                    </div>
                    <input
                      placeholder="Or paste a link (Google Drive, LinkedIn…)"
                      value={resumeName ? "" : form.resume_url}
                      onChange={e => setForm({ ...form, resume_url: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                  <textarea required placeholder="Why are you a great fit?" rows={5} value={form.cover_letter} onChange={e => setForm({ ...form, cover_letter: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="outline" onClick={() => setShowApply(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit application"}</Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
