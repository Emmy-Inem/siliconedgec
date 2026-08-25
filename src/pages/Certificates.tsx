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
import { toast } from "@/hooks/use-toast";

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
              <div className="mb-5">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Verifiable · QR-coded · LinkedIn-ready</span>
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
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      try { await document.fonts?.ready; } catch { /* older browsers */ }
      const surface = certRef.current;
      if (!surface) throw new Error("Certificate surface is unavailable");
      await Promise.all(Array.from(surface.querySelectorAll("img")).map(async (image) => {
        if (image.complete && image.naturalWidth > 0) return;
        try { await image.decode(); } catch { /* html2canvas will report an asset error */ }
      }));
      const canvas = await html2canvas(surface, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 900,
        height: 637,
        logging: false,
      });
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
      toast({ title: "Certificate download failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setDownloading(false);
      setShowCert(false);
    }
  }, [certId, courseName]);

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
            <BrandedCertificate studentName={studentName} courseName={courseName} date={date} certId={certId} instructorName={instructorName} verifyUrl={verifyUrl} />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Hand-drawn ink signature drawn entirely with SVG *paths*.
 *
 * It deliberately contains no <text> and no web font: html2canvas serialises
 * SVG nodes into a standalone image, which drops any externally loaded font
 * (Great Vibes) and fell back to a serif face — that was the single biggest
 * visual difference between the on-page sample and the exported PDF.
 */
function SignatureMark({ name }: { name: string; variant?: "a" | "b" }) {
  return (
    <div style={{ width: 260, height: 64, margin: "0 auto", position: "relative" }} aria-label={`Signature of ${name}`}>
      {/* The name is HTML text, not SVG <text>: html2canvas serialises SVG into a
          standalone image and drops externally loaded fonts, which made the
          exported signature fall back to a serif face. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 48,
          lineHeight: "48px",
          textAlign: "center",
          fontFamily: "'Great Vibes', 'Brush Script MT', cursive",
          fontSize: name.length > 16 ? 34 : 40,
          color: "hsl(var(--navy))",
          whiteSpace: "nowrap",
          transform: "rotate(-2deg)",
        }}
      >
        {name}
      </div>
      {/* Ink flourish drawn under the name as a single continuous pen stroke */}
      <svg
        viewBox="0 0 320 32"
        style={{ position: "absolute", left: 0, bottom: 0, width: 260, height: 22, display: "block" }}
        fill="none"
      >
        <path
          d="M12 18 C70 6, 120 28, 176 14 S268 0, 306 12"
          stroke="hsl(var(--navy))"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
        <path
          d="M292 12 C300 6, 304 16, 296 20"
          stroke="hsl(var(--navy))"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}


/** Gold wax-style seal drawn entirely in SVG so it rasterises crisply in the PDF. */
function SealMark() {
  return (
    <svg viewBox="0 0 96 96" className="w-24 h-24" role="img" aria-label="Verified seal">
      <defs>
        <radialGradient id="sealGold" cx="32%" cy="30%" r="78%">
          <stop offset="0%" stopColor="hsl(45 100% 70%)" />
          <stop offset="60%" stopColor="hsl(45 90% 48%)" />
          <stop offset="100%" stopColor="hsl(45 82% 34%)" />
        </radialGradient>
      </defs>
      <circle cx="48" cy="48" r="46" fill="url(#sealGold)" />
      <circle cx="48" cy="48" r="45" fill="none" stroke="hsl(45 60% 30%)" strokeWidth="1.5" opacity="0.5" />
      <circle
        cx="48" cy="48" r="39"
        fill="none"
        stroke="hsl(var(--navy))"
        strokeOpacity="0.4"
        strokeWidth="1.6"
        strokeDasharray="5 4"
      />
      {/* Award mark */}
      <g stroke="hsl(var(--navy))" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="48" cy="38" r="10" />
        <path d="M41 47 L38 61 L48 56 L58 61 L55 47" />
      </g>
      <text
        x="48" y="79"
        textAnchor="middle"
        fill="hsl(var(--navy))"
        style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.6 }}
      >
        VERIFIED
      </text>
    </svg>
  );
}

function BrandedCertificate({
  studentName, courseName, date, certId, instructorName, verifyUrl,
}: {
  studentName: string; courseName: string; date: string; certId: string; instructorName?: string; verifyUrl?: string;
}) {
  const lead = instructorName?.trim() || "Fauziyah Zakariyah";
  return (
    <div className="relative overflow-hidden bg-white" style={{ width: 900, height: 637 }} data-certificate-surface>
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
      {/* Explicit width/height (not utility classes) and an in-SVG rotation:
          html2canvas rasterises the SVG on its own, so CSS transforms and
          class-driven sizing on the element are not reliably applied. */}
      <svg
        style={{ position: "absolute", top: 12, left: 12, width: 64, height: 64, pointerEvents: "none" }}
        viewBox="0 0 64 64"
        fill="none"
      >
        <path d="M2 32 Q2 2 32 2" stroke="hsl(var(--gold))" strokeWidth="1.5" />
        <path d="M10 32 Q10 10 32 10" stroke="hsl(var(--gold) / 0.5)" strokeWidth="1" />
        <circle cx="32" cy="2" r="1.5" fill="hsl(var(--gold))" />
        <circle cx="2" cy="32" r="1.5" fill="hsl(var(--gold))" />
      </svg>
      <svg
        style={{ position: "absolute", bottom: 12, right: 12, width: 64, height: 64, pointerEvents: "none" }}
        viewBox="0 0 64 64"
        fill="none"
      >
        <g transform="rotate(180 32 32)">
          <path d="M2 32 Q2 2 32 2" stroke="hsl(var(--gold))" strokeWidth="1.5" />
          <path d="M10 32 Q10 10 32 10" stroke="hsl(var(--gold) / 0.5)" strokeWidth="1" />
          <circle cx="32" cy="2" r="1.5" fill="hsl(var(--gold))" />
          <circle cx="2" cy="32" r="1.5" fill="hsl(var(--gold))" />
        </g>
      </svg>

      {/* Watermark seal in background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
        <div className="w-72 h-72 rounded-full border-[12px]" style={{ borderColor: "hsl(var(--navy))" }} />
      </div>

      <div className="relative text-center h-full flex flex-col" style={{ padding: "40px 64px" }}>
        {/* Header — logo */}
        <div className="flex justify-center" style={{ marginBottom: 12 }}>
          <img src={logoDark} alt="Silicon Edge Consulting" className="h-10" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.4em] font-semibold mb-5" style={{ color: "hsl(var(--navy) / 0.55)" }}>
          Silicon Edge Consulting · Tech Academy
        </p>

        {/* Title with flanking ornaments.
            Neither flex centering nor inline vertical-align survives the
            html2canvas raster for 1px rules, so the rules are absolutely
            positioned inside a fixed-height row — geometry html2canvas
            reproduces exactly. */}
        <div className="mb-1" style={{ position: "relative", height: 16, textAlign: "center", lineHeight: "16px", fontSize: 0 }}>
          <span
            style={{ position: "absolute", top: 8, left: 155, width: 64, height: 1, background: "hsl(var(--gold))" }}
          />
          <span
            style={{ position: "absolute", top: 8, right: 155, width: 64, height: 1, background: "hsl(var(--gold))" }}
          />
          <span
            className="uppercase font-bold"
            style={{
              display: "inline-block",
              verticalAlign: "top",
              fontSize: 12,
              lineHeight: "16px",
              letterSpacing: "0.45em",
              textIndent: "0.45em",
              color: "hsl(var(--gold))",
            }}
          >
            Certificate of Completion
          </span>
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

        {/* Badge row. html2canvas mis-computes the baseline of inline SVGs, which is
            what pushed these icons out of line in the exported PDF — so each icon
            sits in its own fixed-size flex box with an explicit line-height. */}
        <div className="mb-auto" style={{ color: "#6b7280", textAlign: "center", fontSize: 0 }}>
          {[
            { Icon: CheckCircle2, label: "All modules completed", color: "hsl(var(--primary))" },
            { Icon: Shield, label: "Digitally verified", color: "hsl(var(--primary))" },
            { Icon: Award, label: "Hands-on capstone graded", color: "hsl(var(--gold))" },
          ].map(({ Icon, label, color }) => (
            <span key={label} style={{ display: "inline-block", verticalAlign: "middle", margin: "0 16px", lineHeight: "16px" }}>
              <span
                style={{
                  display: "inline-block",
                  verticalAlign: "middle",
                  width: 14,
                  height: 16,
                  lineHeight: "16px",
                  paddingTop: 1,
                  boxSizing: "border-box",
                }}
              >
                <Icon style={{ width: 14, height: 14, color, display: "block" }} />
              </span>
              <span style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 6, fontSize: 12, lineHeight: "16px", height: 16 }}>
                {label}
              </span>
            </span>
          ))}
        </div>

        {/* Footer — signatures + seal */}
        {/* Every column reserves the same 72px mark area so the three rule lines and
            the captions below them land on exactly the same baseline in the PDF. */}
        <div className="grid grid-cols-3 items-start" style={{ columnGap: 16, marginTop: 24 }}>
          <div className="text-center">
            <div className="flex items-end justify-center" style={{ height: 72 }}>
              <SignatureMark name={lead} />
            </div>
            <div className="w-full" style={{ height: 1, background: "hsl(var(--navy) / 0.4)" }} />
            <p className="text-[10px] uppercase tracking-widest mt-1.5 font-semibold" style={{ color: "#6b7280", minHeight: 26 }}>
              {lead} · Lead Instructor
            </p>
          </div>

          {/* Center seal — same mark area, no rule underneath */}
          <div className="flex items-end justify-center" style={{ height: 72 }}>
            <SealMark />
          </div>

          <div className="text-center">
            <div className="flex items-end justify-center" style={{ height: 72 }}>
              {verifyUrl ? (
                <div className="bg-white p-1.5 rounded" style={{ border: "1px solid hsl(var(--navy) / 0.15)" }}>
                  <QRCodeSVG value={verifyUrl} size={56} level="M" />
                </div>
              ) : (
                <SignatureMark name="Silicon Edge" variant="b" />
              )}
            </div>
            <div className="w-full" style={{ height: 1, background: "hsl(var(--navy) / 0.4)" }} />
            <p className="text-[10px] uppercase tracking-widest mt-1.5 font-semibold" style={{ color: "#6b7280", minHeight: 26 }}>
              {verifyUrl ? "Scan to verify" : "Silicon Edge Consulting · Digital Signature"}
            </p>
          </div>
        </div>

        {/* Bottom meta strip */}
        <div
          className="grid grid-cols-3 rounded-md text-left px-4 py-2.5"
          style={{ background: "hsl(var(--navy))", columnGap: 12, marginTop: 24 }}
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
