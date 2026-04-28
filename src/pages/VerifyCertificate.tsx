import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader2, CheckCircle2, XCircle, Award } from "lucide-react";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { useEffect } from "react";
import { trackLead } from "@/lib/track-lead";

export default function VerifyCertificate() {
  const { code } = useParams<{ code: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["verify-cert", code],
    queryFn: async () => {
      if (!code) return null;
      const { data: cert } = await supabase
        .from("certificates")
        .select("id, user_id, course_id, verification_code, issued_at")
        .eq("verification_code", code.toUpperCase())
        .maybeSingle();
      if (!cert) return null;

      const [{ data: course }, { data: profile }] = await Promise.all([
        supabase.from("courses").select("title, category, duration_hours").eq("id", cert.course_id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("user_id", cert.user_id).maybeSingle(),
      ]);

      return { cert, course, recipient: profile?.full_name ?? "Verified Student" };
    },
    enabled: !!code,
  });

  useEffect(() => {
    if (isLoading || !code) return;
    trackLead({
      formType: "certificate_verify",
      formData: { code, valid: !!data, course_id: data?.cert?.course_id ?? null },
    }).catch(() => {/* never block UX */});
  }, [code, isLoading, data]);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Verify Certificate" description="Validate the authenticity of a Silicon Edge certificate." />
      <Header />
      <section className="pt-28 pb-20 min-h-[60vh]">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="text-center mb-8">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center mb-4">
                <Award className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-heading text-3xl font-bold">Certificate Verification</h1>
              <p className="text-muted-foreground text-sm mt-1">Verifying code: <code className="font-mono text-xs">{code}</code></p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Looking up certificate...</p>
                </div>
              ) : data ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-green-700 dark:text-green-400">Valid Certificate</p>
                      <p className="text-xs text-muted-foreground">This certificate is authentic and was issued by Silicon Edge.</p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-muted-foreground">Recipient</dt>
                      <dd className="font-semibold mt-1">{data.recipient}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-muted-foreground">Course</dt>
                      <dd className="font-semibold mt-1">{data.course?.title ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-muted-foreground">Issued</dt>
                      <dd className="font-semibold mt-1">{new Date(data.cert.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-muted-foreground">Verification Code</dt>
                      <dd className="font-mono font-semibold mt-1">{data.cert.verification_code}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <XCircle className="h-10 w-10 text-destructive" />
                  <p className="font-semibold">Certificate Not Found</p>
                  <p className="text-sm text-muted-foreground">No certificate matches that verification code.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
