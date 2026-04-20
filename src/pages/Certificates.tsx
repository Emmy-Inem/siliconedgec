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
import certificateCelebration from "@/assets/certificate-celebration.jpg";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { SEO } from "@/components/SEO";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export default function Certificates() {
  const { user } = useAuth();

  const { data: completedCourses } = useQuery({
    queryKey: ["completed-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(title, category, duration_hours, instructor_id, instructors:instructor_id(name))")
        .eq("user_id", user!.id)
        .eq("is_completed", true);
      return data ?? [];
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
      <Header />

      <section className="bg-hero pt-28 pb-14 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "hsl(var(--primary))" }} />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="font-heading text-3xl md:text-5xl font-bold text-hero mb-3">Certificates</h1>
              <p className="text-hero-muted text-lg max-w-xl">
                Earn verified, industry-recognized certificates that prove your skills to employers.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <img
                src={certificateCelebration}
                alt="Student celebrating certificate"
                className="rounded-2xl border border-primary/10 shadow-xl shadow-primary/10 w-full max-w-md ml-auto"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
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
                className="bg-card rounded-xl border border-border p-8 text-center hover:border-primary/30 hover:shadow-lg transition-all group"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors"
                >
                  <item.icon className="h-7 w-7 text-primary" />
                </motion.div>
                <h3 className="font-heading font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* User's Earned Certificates */}
          {user && completedCourses && completedCourses.length > 0 && (
            <motion.div {...fadeUp} className="mb-16">
              <h2 className="font-heading text-2xl font-bold mb-6 text-center">Your Certificates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {completedCourses.map((enrollment: any) => {
                  const certDate = new Date(enrollment.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
                  const certId = `SE-${enrollment.id.slice(0, 8).toUpperCase()}`;
                  return (
                    <CertificateCardWithDownload
                      key={enrollment.id}
                      courseName={enrollment.courses?.title ?? "Course"}
                      studentName={userName}
                      date={certDate}
                      certId={certId}
                      instructorName={enrollment.courses?.instructors?.name}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Sample Certificate Preview */}
          <motion.div {...fadeUp} className="max-w-3xl mx-auto">
            <h2 className="font-heading text-2xl font-bold mb-6 text-center">
              {user && completedCourses && completedCourses.length > 0 ? "Certificate Preview" : "Sample Certificate"}
            </h2>
            <DownloadableCertificate
              studentName={userName}
              courseName="Cloud Engineering Crash Course"
              date="March 7, 2026"
              certId="SE-2026-A1B2C3"
              instructorName="Dr. Amara Osei"
            />
          </motion.div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Ready to earn your certificate?</p>
            <Button size="lg" asChild className="hover-scale">
              <Link to="/courses">Browse Courses</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function CertificateCardWithDownload({
  courseName, studentName, date, certId, instructorName,
}: {
  courseName: string; studentName: string; date: string; certId: string; instructorName?: string;
}) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [showCert, setShowCert] = useState(false);

  const handleDownload = useCallback(async () => {
    setShowCert(true);
    setDownloading(true);
    // Wait for render
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
          <p className="text-muted-foreground text-xs font-mono">{certId}</p>
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
      {/* Hidden certificate for PDF rendering */}
      {showCert && (
        <div className="fixed -left-[9999px] top-0">
          <div ref={certRef}>
            <CertificateForPDF studentName={studentName} courseName={courseName} date={date} certId={certId} instructorName={instructorName} />
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
  studentName, courseName, date, certId, instructorName,
}: {
  studentName: string; courseName: string; date: string; certId: string; instructorName?: string;
}) {
  // Standalone PDF-only version with inline styles for html2canvas compatibility
  return (
    <div style={{ width: 900, background: "#fff", padding: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ border: "3px solid #d4a017", borderRadius: 16, position: "relative", overflow: "hidden" }}>
        {/* Purple corners */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 60, height: 60, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, left: -30, width: 84, height: 84, transform: "rotate(45deg)", background: "#7c3aed" }} />
        </div>
        <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 84, height: 84, transform: "rotate(45deg)", background: "#7c3aed" }} />
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 60, height: 60, overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: -30, left: -30, width: 84, height: 84, transform: "rotate(45deg)", background: "#7c3aed" }} />
        </div>
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 60, height: 60, overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: -30, right: -30, width: 84, height: 84, transform: "rotate(45deg)", background: "#7c3aed" }} />
        </div>

        <div style={{ padding: "50px 60px", textAlign: "center" }}>
          <div style={{ width: 120, height: 4, background: "#d4a017", margin: "0 auto 30px", borderRadius: 2 }} />
          <img src={logoDark} alt="Silicon Edge Consulting" style={{ height: 44, marginBottom: 24 }} crossOrigin="anonymous" />
          <div style={{ display: "inline-block", padding: "8px 24px", border: "2px solid #d4a017", borderRadius: 4, background: "rgba(212,160,23,0.1)", marginBottom: 30 }}>
            <p style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>Certificate of Completion</p>
          </div>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 12px" }}>This is to certify that</p>
          <p style={{ fontSize: 34, fontWeight: 700, color: "#7c3aed", margin: "0 0 16px" }}>{studentName}</p>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 12px" }}>has successfully completed</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 30px" }}>{courseName}</p>
          <div style={{ width: "100%", height: 1, background: "#d4a017", marginBottom: 24 }} />
          <div style={{ display: "flex", justifyContent: "space-between", background: "#1a1a2e", borderRadius: 8, padding: 16 }}>
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
          </div>
          <p style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.15em", marginTop: 20 }}>www.siliconedgec.com</p>
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
    <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-white">
      <div className="absolute inset-0 rounded-2xl border-[3px]" style={{ borderColor: "hsl(var(--gold))" }} />

      {/* Purple branded corners */}
      {["top-0 left-0 -top-10 -left-10", "top-0 right-0 -top-10 -right-10", "bottom-0 left-0 -bottom-10 -left-10", "bottom-0 right-0 -bottom-10 -right-10"].map((pos, i) => {
        const [outer1, outer2, inner1, inner2] = pos.split(" ");
        return (
          <div key={i} className={`absolute ${outer1} ${outer2} w-20 h-20 overflow-hidden`}>
            <div className={`absolute ${inner1} ${inner2} w-28 h-28 rotate-45`} style={{ background: "hsl(var(--primary))" }} />
          </div>
        );
      })}

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='52' viewBox='0 0 60 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%237c3aed' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 52px",
        }}
      />

      <div className="relative p-8 md:p-14 text-center">
        <div className="w-32 h-1 rounded-full mb-8 mx-auto" style={{ background: "hsl(var(--gold))" }} />
        <div className="flex justify-center mb-6">
          <img src={logoDark} alt="Silicon Edge Consulting" className="h-12" />
        </div>
        <div className="inline-block px-6 py-2 mb-8 border-2 rounded" style={{ borderColor: "hsl(var(--gold))", background: "hsl(45 100% 51% / 0.1)" }}>
          <p className="text-xs uppercase tracking-[0.35em] font-heading font-bold" style={{ color: "hsl(var(--navy))" }}>
            Certificate of Completion
          </p>
        </div>
        <p className="text-sm mb-3" style={{ color: "#6b7280" }}>This is to certify that</p>
        <p className="font-heading font-bold text-3xl md:text-4xl mb-4" style={{ color: "hsl(var(--primary))" }}>{studentName}</p>
        <p className="text-sm mb-3" style={{ color: "#6b7280" }}>has successfully completed</p>
        <p className="font-heading font-bold text-xl md:text-2xl mb-8" style={{ color: "hsl(var(--navy))" }}>{courseName}</p>
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-sm" style={{ color: "#6b7280" }}>
            <CheckCircle2 className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
            All modules completed
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: "#6b7280" }}>
            <Shield className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
            Digitally verified
          </div>
        </div>
        <div className="w-full h-px mb-6" style={{ background: "hsl(var(--gold))" }} />
        <div className="grid grid-cols-3 gap-4 text-left rounded-lg p-4" style={{ background: "hsl(var(--navy))" }}>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1 font-medium" style={{ color: "hsl(var(--gold))" }}>Date Issued</p>
            <p className="text-sm font-heading font-semibold text-white">{date}</p>
          </div>
          <div className="text-center">
            {instructorName && (
              <>
                <p className="text-[10px] uppercase tracking-wider mb-1 font-medium" style={{ color: "hsl(var(--gold))" }}>Instructor</p>
                <p className="text-sm font-heading font-semibold text-white">{instructorName}</p>
              </>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider mb-1 font-medium" style={{ color: "hsl(var(--gold))" }}>Certificate ID</p>
            <p className="text-sm font-heading font-semibold font-mono text-white">{certId}</p>
          </div>
        </div>
        <p className="mt-6 text-[10px] tracking-wider" style={{ color: "#9ca3af" }}>www.siliconedgec.com</p>
      </div>
    </div>
  );
}
