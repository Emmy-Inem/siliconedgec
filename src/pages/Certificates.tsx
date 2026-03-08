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
    <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 shadow-xl shadow-primary/5">
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-primary/30 rounded-tl-2xl" />
      <div className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-primary/30 rounded-tr-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-primary/30 rounded-bl-2xl" />
      <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-primary/30 rounded-br-2xl" />

      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary)) 1px, transparent 1px), radial-gradient(circle at 75% 75%, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative bg-card/95 p-10 md:p-14 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <img src={logoDark} alt="Silicon Edge Consulting" className="h-10 dark:hidden" />
          <img src={logoLight} alt="Silicon Edge Consulting" className="h-10 hidden dark:block" />
        </div>

        {/* Gold accent line */}
        <div className="w-20 h-1 mx-auto mb-6 rounded-full" style={{ background: `hsl(var(--gold))` }} />

        <p className="text-xs text-muted-foreground uppercase tracking-[0.3em] mb-6 font-medium">
          Certificate of Completion
        </p>

        <p className="text-muted-foreground text-sm mb-2">This is to certify that</p>

        <p
          className="font-heading font-bold text-3xl md:text-4xl mb-3"
          style={{ color: `hsl(var(--primary))` }}
        >
          {studentName}
        </p>

        <p className="text-muted-foreground text-sm mb-2">has successfully completed the course</p>

        <p className="font-heading font-semibold text-xl md:text-2xl mb-8">{courseName}</p>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            All modules completed
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Digitally verified
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-border pt-6 grid grid-cols-3 gap-4 text-left">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Date Issued</p>
            <p className="text-sm font-medium">{date}</p>
          </div>
          <div className="text-center">
            {instructorName && (
              <>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Instructor</p>
                <p className="text-sm font-medium">{instructorName}</p>
              </>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Certificate ID</p>
            <p className="text-sm font-medium font-mono">{certId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
