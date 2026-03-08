import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GraduationCap, Shield, Download, ExternalLink, Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

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

      <section className="bg-hero pt-28 pb-14">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-hero mb-3">Certificates</h1>
            <p className="text-hero-muted text-lg max-w-xl">
              Earn verified, industry-recognized certificates that prove your skills to employers.
            </p>
          </motion.div>
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
                className="bg-card rounded-xl border border-border p-8 text-center hover:border-primary/30 hover:shadow-lg transition-all hover-scale"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* User's Earned Certificates */}
          {user && completedCourses && completedCourses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <h2 className="font-heading text-2xl font-bold mb-6 text-center">Your Certificates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {completedCourses.map((enrollment: any) => (
                  <CertificateCard
                    key={enrollment.id}
                    courseName={enrollment.courses?.title ?? "Course"}
                    studentName={userName}
                    date={new Date(enrollment.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    certId={`SE-${enrollment.id.slice(0, 8).toUpperCase()}`}
                    instructorName={enrollment.courses?.instructors?.name}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Sample Certificate Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="font-heading text-2xl font-bold mb-6 text-center">
              {user && completedCourses && completedCourses.length > 0 ? "Certificate Preview" : "Sample Certificate"}
            </h2>
            <BrandedCertificate
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

function CertificateCard({
  courseName,
  studentName,
  date,
  certId,
  instructorName,
}: {
  courseName: string;
  studentName: string;
  date: string;
  certId: string;
  instructorName?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-4 hover:border-primary/30 hover:shadow-lg transition-all">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Award className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-heading font-semibold text-sm truncate">{courseName}</h3>
        <p className="text-muted-foreground text-xs mt-1">Issued {date}</p>
        <p className="text-muted-foreground text-xs font-mono">{certId}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-primary font-medium shrink-0">
        <CheckCircle2 className="h-4 w-4" />
        Verified
      </div>
    </div>
  );
}

function BrandedCertificate({
  studentName,
  courseName,
  date,
  certId,
  instructorName,
}: {
  studentName: string;
  courseName: string;
  date: string;
  certId: string;
  instructorName?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={{ background: "hsl(var(--navy))" }}>
      {/* Gold border frame */}
      <div className="absolute inset-0 rounded-2xl border-[3px]" style={{ borderColor: "hsl(var(--gold))" }} />
      <div className="absolute inset-2 rounded-xl border" style={{ borderColor: "hsl(var(--gold) / 0.4)" }} />

      {/* Hexagon pattern background (matching SEC brand) */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='52' viewBox='0 0 60 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 52px",
        }}
      />

      <div className="relative p-8 md:p-14 text-center">
        {/* Top gold accent bar */}
        <div className="w-full h-1 rounded-full mb-8 mx-auto max-w-xs" style={{ background: `linear-gradient(90deg, transparent, hsl(var(--gold)), transparent)` }} />

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logoLight} alt="Silicon Edge Consulting" className="h-12" />
        </div>

        {/* Certificate title with gold background like brand style */}
        <div className="inline-block px-6 py-2 mb-8 border-2 rounded" style={{ borderColor: "hsl(var(--gold))", background: "hsl(var(--gold) / 0.15)" }}>
          <p className="text-xs uppercase tracking-[0.35em] font-heading font-bold" style={{ color: "hsl(var(--gold))" }}>
            Certificate of Completion
          </p>
        </div>

        <p className="text-sm mb-3" style={{ color: "hsl(var(--hero-muted))" }}>This is to certify that</p>

        {/* Student name - bold purple like SEC brand */}
        <p className="font-heading font-bold text-3xl md:text-4xl mb-4" style={{ color: "hsl(var(--primary))" }}>
          {studentName}
        </p>

        <p className="text-sm mb-3" style={{ color: "hsl(var(--hero-muted))" }}>has successfully completed</p>

        {/* Course name - white bold like SEC typography */}
        <p className="font-heading font-bold text-xl md:text-2xl mb-8" style={{ color: "hsl(var(--hero-foreground))" }}>
          {courseName}
        </p>

        {/* Verification badges */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-sm" style={{ color: "hsl(var(--hero-muted))" }}>
            <CheckCircle2 className="h-4 w-4" style={{ color: "hsl(var(--gold))" }} />
            All modules completed
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: "hsl(var(--hero-muted))" }}>
            <Shield className="h-4 w-4" style={{ color: "hsl(var(--gold))" }} />
            Digitally verified
          </div>
        </div>

        {/* Gold divider */}
        <div className="w-full h-px mb-6" style={{ background: `linear-gradient(90deg, transparent, hsl(var(--gold) / 0.5), transparent)` }} />

        {/* Footer info bar - styled like SEC social bar */}
        <div className="grid grid-cols-3 gap-4 text-left rounded-lg p-4 border" style={{ borderColor: "hsl(var(--gold) / 0.3)", background: "hsl(var(--gold) / 0.05)" }}>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1 font-medium" style={{ color: "hsl(var(--gold))" }}>Date Issued</p>
            <p className="text-sm font-heading font-semibold" style={{ color: "hsl(var(--hero-foreground))" }}>{date}</p>
          </div>
          <div className="text-center">
            {instructorName && (
              <>
                <p className="text-[10px] uppercase tracking-wider mb-1 font-medium" style={{ color: "hsl(var(--gold))" }}>Instructor</p>
                <p className="text-sm font-heading font-semibold" style={{ color: "hsl(var(--hero-foreground))" }}>{instructorName}</p>
              </>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider mb-1 font-medium" style={{ color: "hsl(var(--gold))" }}>Certificate ID</p>
            <p className="text-sm font-heading font-semibold font-mono" style={{ color: "hsl(var(--hero-foreground))" }}>{certId}</p>
          </div>
        </div>

        {/* Bottom gold accent bar */}
        <div className="w-full h-1 rounded-full mt-8 mx-auto max-w-xs" style={{ background: `linear-gradient(90deg, transparent, hsl(var(--gold)), transparent)` }} />

        {/* Website watermark */}
        <p className="mt-4 text-[10px] tracking-wider" style={{ color: "hsl(var(--hero-muted) / 0.6)" }}>www.siliconedgec.com</p>
      </div>
    </div>
  );
}
