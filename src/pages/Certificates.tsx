import { useRef, useCallback, useState } from "react";
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

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export default function Certificates() {
  const { user } = useAuth();

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
                src={certificateCelebration}
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
                  return (
                    <CertificateCardWithDownload
                      key={cert.id}
                      courseName={cert.course?.title ?? "Course"}
                      studentName={userName}
                      date={certDate}
                      certId={cert.verification_code}
                      verifyUrl={verifyUrl}
                      instructorName={cert.course?.instructors?.name}
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
              <div className="min-w-[640px] sm:min-w-0">
                <BrandedCertificate
                  studentName={userName}
                  courseName="Cloud Engineering Crash Course"
                  date="March 7, 2026"
                  certId="SE-2026-A1B2C3"
                  instructorName="Dr. Amara Osei"
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
  courseName, studentName, date, certId, instructorName, verifyUrl,
}: {
  courseName: string; studentName: string; date: string; certId: string; instructorName?: string; verifyUrl?: string;
}) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [showCert, setShowCert] = useState(false);

  const handleDownload = useCallback(async () => {
    setShowCert(true);
    setDownloading(true);
    await new Promise((r) => setTimeout(r, 300));
    if (!certRef.current) return;
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${certId}-certificate.pdf`);
    } catch (e) {
      console.error("PDF generation failed", e);
    } finally {
      setDownloading(false);
      setShowCert(false);
    }
  }, [certId]);

  return (
    <>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="bg-card border border-border rounded-xl p-6 flex items-start gap-4 hover:border-primary/30 hover:shadow-lg transition-all"
      >
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Award className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm truncate">{courseName}</h3>
          <p className="text-muted-foreground text-xs mt-1">Issued {date}</p>
          <p className="text-muted-foreground text-xs font-mono truncate">{certId}</p>
          {verifyUrl && (
            <Link to={`/verify/${certId}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
              <Shield className="h-3 w-3" /> Verify
            </Link>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1 text-xs text-primary font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Verified
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
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
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${certId}-certificate.pdf`);
    } catch (e) {
      console.error("PDF generation failed", e);
    } finally {
      setDownloading(false);
    }
  }, [certId]);

  return (
    <div>
      <div ref={certRef}>
        <BrandedCertificate studentName={studentName} courseName={courseName} date={date} certId={certId} instructorName={instructorName} />
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
  return (
    <div style={{ width: 900, background: "#fff", padding: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ border: "3px solid #d4a017", borderRadius: 16, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 60, height: 60, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, left: -30, width: 84, height: 84, transform: "rotate(45deg)", background: "#b13bff" }} />
        </div>
        <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 84, height: 84, transform: "rotate(45deg)", background: "#b13bff" }} />
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 60, height: 60, overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: -30, left: -30, width: 84, height: 84, transform: "rotate(45deg)", background: "#b13bff" }} />
        </div>
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 60, height: 60, overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: -30, right: -30, width: 84, height: 84, transform: "rotate(45deg)", background: "#b13bff" }} />
        </div>

        <div style={{ padding: "50px 60px", textAlign: "center" }}>
          <div style={{ width: 120, height: 4, background: "#d4a017", margin: "0 auto 30px", borderRadius: 2 }} />
          <img src={logoDark} alt="Silicon Edge Consulting" style={{ height: 44, marginBottom: 24 }} crossOrigin="anonymous" />
          <div style={{ display: "inline-block", padding: "8px 24px", border: "2px solid #d4a017", borderRadius: 4, background: "rgba(212,160,23,0.1)", marginBottom: 30 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>Certificate of Completion</p>
          </div>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 12px" }}>This is to certify that</p>
          <p style={{ fontSize: 34, fontWeight: 700, color: "#b13bff", margin: "0 0 16px" }}>{studentName}</p>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 12px" }}>has successfully completed</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 30px" }}>{courseName}</p>
          <div style={{ width: "100%", height: 1, background: "#d4a017", marginBottom: 24 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1a1a2e", borderRadius: 8, padding: 16 }}>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "#d4a017", margin: "0 0 4px", fontWeight: 600 }}>Date Issued</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>{date}</p>
            </div>
            {instructorName && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "#d4a017", margin: "0 0 4px", fontWeight: 600 }}>Instructor</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>{instructorName}</p>
              </div>
            )}
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "#d4a017", margin: "0 0 4px", fontWeight: 600 }}>Certificate ID</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0, fontFamily: "monospace" }}>{certId}</p>
            </div>
            {verifyUrl && (
              <div style={{ background: "#fff", padding: 6, borderRadius: 4, marginLeft: 16 }}>
                <QRCodeSVG value={verifyUrl} size={64} level="M" />
              </div>
            )}
          </div>
          <p style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.15em", marginTop: 20 }}>
            {verifyUrl ? `Verify at: ${verifyUrl}` : "www.siliconedgec.com"}
          </p>
        </div>
      </div>
    </div>
  );
}


function BrandedCertificate({
  studentName, courseName, date, certId, instructorName,
}: {
  studentName: string; courseName: string; date: string; certId: string; instructorName?: string;
}) {
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

      <div className="relative px-8 md:px-16 py-8 md:py-10 text-center h-full flex flex-col">
        {/* Header — logo */}
        <div className="flex justify-center mb-3">
          <img src={logoDark} alt="Silicon Edge Consulting" className="h-9 md:h-10" />
        </div>
        <p className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-semibold mb-5" style={{ color: "hsl(var(--navy) / 0.55)" }}>
          Silicon Edge Consulting · Tech Academy
        </p>

        {/* Title with flanking ornaments */}
        <div className="flex items-center justify-center gap-4 mb-1">
          <span className="h-px w-10 md:w-16" style={{ background: "hsl(var(--gold))" }} />
          <p className="text-[10px] md:text-xs uppercase tracking-[0.45em] font-bold" style={{ color: "hsl(var(--gold))" }}>
            Certificate of Completion
          </p>
          <span className="h-px w-10 md:w-16" style={{ background: "hsl(var(--gold))" }} />
        </div>

        <p className="text-xs md:text-sm italic mb-2 mt-4" style={{ color: "#6b7280" }}>This is to proudly certify that</p>
        <p
          className="font-bold text-3xl md:text-5xl mb-2 leading-tight"
          style={{
            color: "hsl(var(--navy))",
            fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: "0.01em",
          }}
        >
          {studentName}
        </p>
        <div className="mx-auto h-px w-40 md:w-64 mb-4" style={{ background: "hsl(var(--navy) / 0.2)" }} />

        <p className="text-xs md:text-sm mb-2" style={{ color: "#6b7280" }}>
          has successfully completed the live, instructor-led program
        </p>
        <p className="font-heading font-semibold text-lg md:text-2xl mb-5" style={{ color: "hsl(var(--primary))" }}>
          {courseName}
        </p>

        <div className="flex items-center justify-center gap-5 md:gap-8 text-[11px] md:text-xs mb-auto" style={{ color: "#6b7280" }}>
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
            <p
              className="text-xl md:text-2xl mb-1"
              style={{
                color: "hsl(var(--navy))",
                fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive",
                transform: "rotate(-2deg)",
                display: "inline-block",
              }}
            >
              {instructorName ?? "Dr. A. Osei"}
            </p>
            <div className="h-px w-full mt-1" style={{ background: "hsl(var(--navy) / 0.4)" }} />
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest mt-1.5 font-semibold" style={{ color: "#6b7280" }}>
              Lead Instructor
            </p>
          </div>

          {/* Center seal */}
          <div className="flex justify-center">
            <div
              className="relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle at 30% 30%, hsl(45 100% 65%), hsl(45 90% 45%) 60%, hsl(45 80% 35%))",
                boxShadow: "0 6px 16px -4px hsl(var(--gold) / 0.6), inset 0 0 0 2px hsl(var(--gold) / 0.4)",
              }}
            >
              <div
                className="absolute inset-1 rounded-full border-2"
                style={{ borderColor: "hsl(var(--navy) / 0.35)", borderStyle: "dashed" }}
              />
              <div className="text-center" style={{ color: "hsl(var(--navy))" }}>
                <Award className="h-5 w-5 md:h-6 md:w-6 mx-auto" strokeWidth={2.4} />
                <p className="text-[7px] md:text-[8px] font-bold tracking-widest leading-none mt-0.5">VERIFIED</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p
              className="text-xl md:text-2xl mb-1"
              style={{
                color: "hsl(var(--navy))",
                fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive",
                transform: "rotate(-1deg)",
                display: "inline-block",
              }}
            >
              E. Adeyemi
            </p>
            <div className="h-px w-full mt-1" style={{ background: "hsl(var(--navy) / 0.4)" }} />
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest mt-1.5 font-semibold" style={{ color: "#6b7280" }}>
              Director, Academy
            </p>
          </div>
        </div>

        {/* Bottom meta strip */}
        <div
          className="mt-6 grid grid-cols-3 gap-3 rounded-md text-left px-4 py-2.5"
          style={{ background: "hsl(var(--navy))" }}
        >
          <div>
            <p className="text-[8px] md:text-[9px] uppercase tracking-widest font-medium" style={{ color: "hsl(var(--gold))" }}>Issued</p>
            <p className="text-[11px] md:text-xs font-semibold text-white">{date}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] md:text-[9px] uppercase tracking-widest font-medium" style={{ color: "hsl(var(--gold))" }}>Verify at</p>
            <p className="text-[11px] md:text-xs font-semibold text-white">siliconedgec.com/verify</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] md:text-[9px] uppercase tracking-widest font-medium" style={{ color: "hsl(var(--gold))" }}>Certificate ID</p>
            <p className="text-[11px] md:text-xs font-mono font-semibold text-white">{certId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
