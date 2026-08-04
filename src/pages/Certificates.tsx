import { useRef, useCallback, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GraduationCap, Shield, Download, ExternalLink, Award, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import logoDark from "@/assets/logo-dark.png";
import certificateCelebration from "@/assets/stock/certificate-holder.jpg";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { SEO } from "@/components/SEO";
import { siteUrl } from "@/lib/site-url";
import { tikTokEvent, metaCustomEvent } from "@/lib/analytics";
import { usePageImage } from "@/hooks/usePageImage";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export default function Certificates() {
  const { user } = useAuth();
  const heroPhoto = usePageImage("page_image_certificate_hero", certificateCelebration);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoDownloadFlag = searchParams.get("download");

  // Real DB-backed certificates (auto-issued via trigger when course completed)
  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["my-certificates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: certs } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: false });
      if (!certs?.length) return [];
      const courseIds = certs.map((c) => c.course_id);
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title, category, instructor_id, instructors:instructor_id(name)")
        .in("id", courseIds);
      return certs.map((c) => ({
        ...c,
        course: courses?.find((co) => co.id === c.course_id),
      }));
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const userName = profile?.full_name || user?.user_metadata?.full_name || "Your Name";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Verifiable Certificates — Silicon Edge"
        description="Earn verifiable, QR-coded course completion certificates. Each certificate has a unique ID employers can validate online."
      />
      <Header />

      <section className="relative overflow-hidden bg-white pt-28 pb-20 border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--primary) / 0.16) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
          }}
        />
        <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full opacity-20 blur-3xl" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "hsl(var(--gold))" }} />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5">
                <Award className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-primary">Verifiable · QR-Coded · LinkedIn-ready</span>
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-[1.05]">
                Certificates that <span className="text-gradient">open doors</span><span className="text-gold">.</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl leading-relaxed">
                Earn industry-recognized completion certificates with a unique verification ID employers can validate online — instantly downloadable as PDF.
              </p>
              <div className="flex flex-wrap gap-3 mt-7">
                <Button size="lg" asChild className="hover-scale">
                  <Link to="/courses">Start a Course</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#sample">See a Sample</a>
                </Button>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: -3 }}
              transition={{ duration: 0.7, delay: 0.2, type: "spring" }}
              className="hidden lg:block relative"
            >
              <div className="absolute -inset-6 bg-gradient-to-br from-primary/20 via-transparent to-gold/20 rounded-3xl blur-2xl" />
              <img
                src={heroPhoto}
                alt="Student celebrating certificate"
                className="relative rounded-2xl border border-primary/20 shadow-2xl shadow-primary/20 w-full max-w-md ml-auto"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {/* Premium stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-5xl mx-auto mb-16"
          >
            {[
              { v: "100%", l: "Verifiable" },
              { v: "QR", l: "Coded ID" },
              { v: "PDF", l: "Instant download" },
              { v: "1-click", l: "LinkedIn share" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 text-center">
                <div className="font-heading text-2xl font-bold text-gradient">{s.v}</div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              { icon: GraduationCap, title: "Complete a Course", desc: "Finish all modules and pass the final assessment to earn your certificate." },
              { icon: Shield, title: "Digitally Verified", desc: "Each certificate includes a unique verification ID that employers can validate." },
              { icon: ExternalLink, title: "Share Everywhere", desc: "Add to LinkedIn, share on social media, or embed on your portfolio site." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="relative bg-card rounded-2xl border border-border p-8 text-center hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all group overflow-hidden"
              >
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform">
                  <item.icon className="h-7 w-7 text-primary-foreground" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gold ring-2 ring-background" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* User's Earned Certificates */}
          {user && certificates && certificates.length > 0 && (
            <motion.div {...fadeUp} className="mb-16">
              <h2 className="font-heading text-xl sm:text-2xl font-bold mb-6 text-center">Your Certificates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {certificates.map((cert: any) => {
                  const certDate = new Date(cert.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
                   const verifyUrl = siteUrl(`/verify/${cert.verification_code}`);
                  const isLatest = certificates[0]?.id === cert.id;
                  const shouldAutoDownload = autoDownloadFlag === "latest" && isLatest;
                  return (
                    <CertificateCardWithDownload
                      key={cert.id}
                      courseName={cert.course?.title ?? "Course"}
                      studentName={userName}
                      date={certDate}
                      certId={cert.verification_code}
                      verifyUrl={verifyUrl}
                      instructorName={cert.course?.instructors?.name}
                      autoDownload={shouldAutoDownload}
                      onAutoDownloaded={() => {
                        const next = new URLSearchParams(searchParams);
                        next.delete("download");
                        setSearchParams(next, { replace: true });
                      }}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}

          {user && !isLoading && certificates.length === 0 && (
            <motion.div {...fadeUp} className="max-w-2xl mx-auto mb-16 text-center bg-card rounded-2xl border border-border p-10">
              <Award className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">You haven't earned any certificates yet. Complete a course to receive one automatically.</p>
            </motion.div>
          )}

          {/* Sample Certificate Preview (preview-only, no download until a course is completed) */}
          <motion.div {...fadeUp} id="sample" className="max-w-3xl mx-auto scroll-mt-24">
            <h2 className="font-heading text-xl sm:text-2xl font-bold mb-6 text-center">
              {user && certificates && certificates.length > 0 ? "Certificate Preview" : "Sample Certificate"}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm text-center mb-6 sm:mb-8 max-w-xl mx-auto px-2">
              Below is what your certificate will look like — fully branded, with a unique ID and verification link.
              {(!user || certificates.length === 0) && (
                <span className="block mt-2 text-xs">Complete a course to unlock download &amp; sharing.</span>
              )}
            </p>
            {/* Mobile: horizontally scrollable so the full landscape cert stays readable. */}
            <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-thin">
              <div className="min-w-[900px]">
                <BrandedCertificate
                  studentName={userName}
                  courseName="Cloud Engineering Crash Course"
                  date="March 7, 2026"
                  certId="SE-2026-A1B2C3"
                  instructorName="Fauziyah Zakariyah"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2 sm:hidden">← Swipe to see the full certificate →</p>
          </motion.div>

          <motion.div {...fadeUp} className="mt-20 max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl border border-primary/15 p-10">
            <Award className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="font-heading text-2xl font-bold mb-2">Ready to earn yours?</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Browse our catalog of cloud, AI, and DevOps courses — each one ends with a verifiable certificate.</p>
            <Button size="lg" asChild className="hover-scale">
              <Link to="/courses">Browse Courses</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function CertificateCardWithDownload({
  courseName, studentName, date, certId, instructorName, verifyUrl, autoDownload, onAutoDownloaded,
}: {
  courseName: string; studentName: string; date: string; certId: string; instructorName?: string; verifyUrl?: string;
  autoDownload?: boolean; onAutoDownloaded?: () => void;
}) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [showCert, setShowCert] = useState(false);

  const handleDownload = useCallback(async () => {
    setShowCert(true);
    setDownloading(true);
    await new Promise((r) => setTimeout(r, 300));
    // Wait for Great Vibes / Playfair to load, else html2canvas rasterises fallbacks.
    try { await (document as any).fonts?.ready; } catch { /* older browsers */ }
    if (!certRef.current) return;
    try {
      const canvas = await html2canvas(certRef.current, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 3, canvas.height / 3] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 3, canvas.height / 3);
      pdf.save(`${certId}-certificate.pdf`);
      // TikTok conversion: certificate download is a post-completion action.
      tikTokEvent("Download", {
        content_id: certId,
        content_name: courseName,
        content_type: "certificate",
      });
      // Meta has no canonical "Download" event — use a custom event so
      // it shows up under Events Manager → Custom Conversions.
      metaCustomEvent("DownloadCertificate", {
        content_ids: [certId],
        content_name: courseName,
        content_type: "certificate",
      });
    } catch (e) {
      console.error("PDF generation failed", e);
    } finally {
      setDownloading(false);
      setShowCert(false);
    }
  }, [certId]);

  // Auto-trigger PDF generation once when the user lands here from the
  // "Course completed!" notification.
  useEffect(() => {
    if (!autoDownload) return;
    const t = setTimeout(() => {
      handleDownload();
      onAutoDownloaded?.();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownload]);

  return (
    <>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="bg-card border border-border rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start gap-3 sm:gap-4 hover:border-primary/30 hover:shadow-lg transition-all"
      >
        <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto sm:flex-1 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-sm leading-snug break-words">{courseName}</h3>
            <p className="text-muted-foreground text-xs mt-1">Issued {date}</p>
            <p className="text-muted-foreground text-xs font-mono truncate">{certId}</p>
            {verifyUrl && (
              <Link to={`/verify/${certId}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                <Shield className="h-3 w-3" /> Verify
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
          <div className="flex items-center gap-1 text-xs text-primary font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Verified
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 px-3"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
            PDF
          </Button>
        </div>
      </motion.div>
      {showCert && (
        <div className="fixed -left-[9999px] top-0">
          <div ref={certRef}>
            <CertificateForPDF studentName={studentName} courseName={courseName} date={date} certId={certId} instructorName={instructorName} verifyUrl={verifyUrl} />
          </div>
        </div>
      )}
    </>
  );
}

function DownloadableCertificate({
  studentName, courseName, date, certId, instructorName,
}: {
  studentName: string; courseName: string; date: string; certId: string; instructorName?: string;
}) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try { await (document as any).fonts?.ready; } catch { /* older browsers */ }
    try {
      const canvas = await html2canvas(certRef.current, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 3, canvas.height / 3] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 3, canvas.height / 3);
      pdf.save(`${certId}-certificate.pdf`);
      // TikTok conversion: sample/preview certificate download.
      tikTokEvent("Download", {
        content_id: certId,
        content_name: courseName,
        content_type: "certificate",
      });
      metaCustomEvent("DownloadCertificate", {
        content_ids: [certId],
        content_name: courseName,
        content_type: "certificate",
      });
    } catch (e) {
      console.error("PDF generation failed", e);
    } finally {
      setDownloading(false);
    }
  }, [certId]);

  return (
    <div>
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[900px]">
          <BrandedCertificate studentName={studentName} courseName={courseName} date={date} certId={certId} instructorName={instructorName} />
        </div>
      </div>
      <div className="fixed -left-[9999px] top-0" ref={certRef}>
        <CertificateForPDF studentName={studentName} courseName={courseName} date={date} certId={certId} instructorName={instructorName} />
      </div>
      <motion.div
        className="flex justify-center mt-6"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <Button onClick={handleDownload} disabled={downloading} className="hover-scale gap-2">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download Certificate as PDF
        </Button>
      </motion.div>
    </div>
  );
}

function CertificateForPDF({
  studentName, courseName, date, certId, instructorName, verifyUrl,
}: {
  studentName: string; courseName: string; date: string; certId: string; instructorName?: string; verifyUrl?: string;
}) {
  // Rendered off-screen at a fixed 1400px width with `print` so the layout never
  // depends on the visitor's viewport (Tailwind md: breakpoints are viewport-based,
  // which is why mobile downloads used to look nothing like the on-page sample).
  return (
    <div style={{ width: 900, background: "#fff" }}>
      <BrandedCertificate
        print
        studentName={studentName}
        courseName={courseName}
        date={date}
        certId={certId}
        instructorName={instructorName}
        verifyUrl={verifyUrl}
      />
    </div>
  );
}

/** Hand-drawn ink signature: a real stroke path, not just the name typed out. */
function SignatureMark({ name, print }: { name: string; print?: boolean }) {
  return (
    <svg
      viewBox="0 0 320 90"
      className={print ? "h-16 w-auto mx-auto" : "h-12 md:h-16 w-auto mx-auto"}
      fill="none"
      role="img"
      aria-label={`Signature of ${name}`}
    >
      <text
        x="160"
        y="52"
        textAnchor="middle"
        textLength={name.length > 12 ? 280 : undefined}
        lengthAdjust="spacingAndGlyphs"
        style={{ fontFamily: "'Great Vibes', 'Brush Script MT', cursive", fontSize: 44 }}
        fill="hsl(var(--navy))"
        transform="rotate(-3 160 52)"
      >
        {name}
      </text>
      {/* Ink flourish underneath, drawn as a single continuous pen stroke */}
      <path
        d="M18 70 C70 58, 120 82, 176 66 S268 50, 306 62"
        stroke="hsl(var(--navy))"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M292 62 C300 56, 304 66, 296 70"
        stroke="hsl(var(--navy))"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}


function BrandedCertificate({
  studentName, courseName, date, certId, instructorName, verifyUrl, print,
}: {
  studentName, courseName, date, certId, instructorName, verifyUrl, print,
}: {
  studentName: string; courseName: string; date: string; certId: string; instructorName?: string; verifyUrl?: string; print?: boolean;
}) {
  const lead = instructorName?.trim() || "Fauziyah Zakariyah";
  // In print mode we hard-code the desktop scale so the PDF is identical everywhere.
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-white aspect-[1.414/1]">
      {/* Outer double border — gold + thin navy inner */}
      <div className="absolute inset-3 rounded-xl border-[2px] pointer-events-none" style={{ borderColor: "hsl(var(--gold))" }} />
      <div className="absolute inset-[18px] rounded-lg border pointer-events-none" style={{ borderColor: "hsl(var(--navy) / 0.25)" }} />

      {/* Subtle guilloche / engraving pattern */}
      <div
        className="absolute inset-0 opacity-[0.045] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='40' cy='40' r='32' fill='none' stroke='%231a1a2e' stroke-width='0.6'/%3E%3Ccircle cx='40' cy='40' r='24' fill='none' stroke='%231a1a2e' stroke-width='0.4'/%3E%3Ccircle cx='40' cy='40' r='16' fill='none' stroke='%231a1a2e' stroke-width='0.3'/%3E%3C/svg%3E")`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Soft gold corner flourishes (top-left & bottom-right) */}
      <svg className="absolute top-3 left-3 w-16 h-16 pointer-events-none" viewBox="0 0 64 64" fill="none">
        <path d="M2 32 Q2 2 32 2" stroke="hsl(var(--gold))" strokeWidth="1.5" />
        <path d="M10 32 Q10 10 32 10" stroke="hsl(var(--gold) / 0.5)" strokeWidth="1" />
        <circle cx="32" cy="2" r="1.5" fill="hsl(var(--gold))" />
        <circle cx="2" cy="32" r="1.5" fill="hsl(var(--gold))" />
      </svg>
      <svg className="absolute bottom-3 right-3 w-16 h-16 pointer-events-none rotate-180" viewBox="0 0 64 64" fill="none">
        <path d="M2 32 Q2 2 32 2" stroke="hsl(var(--gold))" strokeWidth="1.5" />
        <path d="M10 32 Q10 10 32 10" stroke="hsl(var(--gold) / 0.5)" strokeWidth="1" />
        <circle cx="32" cy="2" r="1.5" fill="hsl(var(--gold))" />
        <circle cx="2" cy="32" r="1.5" fill="hsl(var(--gold))" />
      </svg>

      {/* Watermark seal in background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
        <div className="w-72 h-72 rounded-full border-[12px]" style={{ borderColor: "hsl(var(--navy))" }} />
      </div>

      <div className="relative text-center h-full flex flex-col px-16 py-10">
        {/* Header — logo */}
        <div className="flex justify-center mb-3">
          <img src={logoDark} alt="Silicon Edge Consulting" className="h-10" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.4em] font-semibold mb-5" style={{ color: "hsl(var(--navy) / 0.55)" }}>
          Silicon Edge Consulting · Tech Academy
        </p>

        {/* Title with flanking ornaments */}
        <div className="flex items-center justify-center gap-4 mb-1">
          <span className="h-px w-16" style={{ background: "hsl(var(--gold))" }} />
          <p className="text-xs uppercase tracking-[0.45em] font-bold" style={{ color: "hsl(var(--gold))" }}>
            Certificate of Completion
          </p>
          <span className="h-px w-16" style={{ background: "hsl(var(--gold))" }} />
        </div>

        <p className="text-sm italic mb-2 mt-4" style={{ color: "#6b7280" }}>This is to proudly certify that</p>
        <p
          className="font-bold text-5xl mb-2 leading-tight"
          style={{
            color: "hsl(var(--navy))",
            fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: "0.01em",
          }}
        >
          {studentName}
        </p>
        <div className="mx-auto h-px w-64 mb-4" style={{ background: "hsl(var(--navy) / 0.2)" }} />

        <p className="text-sm mb-2" style={{ color: "#6b7280" }}>
          has successfully completed the live, instructor-led program
        </p>
        <p className="font-heading font-semibold text-2xl mb-5" style={{ color: "hsl(var(--primary))" }}>
          {courseName}
        </p>

        <div className="flex items-center justify-center gap-8 text-xs mb-auto" style={{ color: "#6b7280" }}>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))" }} />
            All modules completed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))" }} />
            Digitally verified
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5" style={{ color: "hsl(var(--gold))" }} />
            Hands-on capstone graded
          </span>
        </div>

        {/* Footer — signatures + seal */}
        <div className="grid grid-cols-3 gap-4 mt-6 items-end">
          <div className="text-center">
            <SignatureMark name={lead} print={print} />
            <div className="h-px w-full mt-1" style={{ background: "hsl(var(--navy) / 0.4)" }} />
            <p className="text-[10px] uppercase tracking-widest mt-1.5 font-semibold" style={{ color: "#6b7280" }}>
              {lead} · Lead Instructor
            </p>
          </div>

          {/* Center seal */}
          <div className="flex justify-center">
            <SealMark />
          </div>

          <div className="text-center">
            {verifyUrl ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-1.5 rounded" style={{ border: "1px solid hsl(var(--navy) / 0.15)" }}>
                  <QRCodeSVG value={verifyUrl} size={print ? 72 : 56} level="M" />
                </div>
                <div className="h-px w-full mt-2" style={{ background: "hsl(var(--navy) / 0.4)" }} />
                <p className="text-[10px] uppercase tracking-widest mt-1.5 font-semibold" style={{ color: "#6b7280" }}>
                  Scan to verify
                </p>
              </div>
            ) : (
              <>
                <SignatureMark name="Silicon Edge" print={print} />
                <div className="h-px w-full mt-1" style={{ background: "hsl(var(--navy) / 0.4)" }} />
                <p className="text-[10px] uppercase tracking-widest mt-1.5 font-semibold" style={{ color: "#6b7280" }}>
                  Silicon Edge Consulting · Digital Signature
                </p>
              </>
            )}
          </div>
        </div>

        {/* Bottom meta strip */}
        <div
          className="mt-6 grid grid-cols-3 gap-3 rounded-md text-left px-4 py-2.5"
          style={{ background: "hsl(var(--navy))" }}
        >
          <div>
            <p className="text-[9px] uppercase tracking-widest font-medium" style={{ color: "hsl(var(--gold))" }}>Issued</p>
            <p className="text-xs font-semibold text-white">{date}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] uppercase tracking-widest font-medium" style={{ color: "hsl(var(--gold))" }}>Verify at</p>
            <p className="text-xs font-semibold text-white">siliconedgec.com/verify</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest font-medium" style={{ color: "hsl(var(--gold))" }}>Certificate ID</p>
            <p className="text-xs font-mono font-semibold text-white">{certId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
