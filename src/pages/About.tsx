import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award, Users, Target, LifeBuoy, ArrowRight, CheckCircle2,
  Globe2, GraduationCap, BriefcaseBusiness, MessagesSquare,
} from "lucide-react";
import instructor1 from "@/assets/stock/instructor-1.jpg";
import instructor2 from "@/assets/stock/instructor-2.jpg";
import instructor3 from "@/assets/stock/instructor-3.jpg";
import instructor4 from "@/assets/stock/instructor-4.jpg";
import mentorStock from "@/assets/stock/mentor.jpg";

const values = [
  { icon: Target, title: "Job-Ready Outcomes", body: "Every program is engineered to land roles, not just hand out certificates. Curricula are mapped to real job descriptions and assessed through portfolio projects." },
  { icon: Users, title: "Live, Mentor-Led", body: "Learn from senior engineers in interactive cohorts — live classes, code reviews, and 1:1 mentorship instead of passive, pre-recorded silos." },
  { icon: Award, title: "Industry-Aligned", body: "Content is aligned with AWS, Microsoft Azure, Google Cloud and modern DevOps certifications, so your learning compounds toward recognized credentials." },
  { icon: LifeBuoy, title: "Career Support", body: "Resume reviews, mock interviews, salary negotiation coaching, and warm introductions to hiring partners across Africa and beyond." },
];

const approach = [
  { title: "Learn by building", body: "Every course is anchored in hands-on labs and real infrastructure — you deploy, break, and fix production-grade systems." },
  { title: "Cohort accountability", body: "Structured schedules, peer groups, and live check-ins keep completion rates high and learning momentum strong." },
  { title: "Portfolio over theory", body: "You graduate with shipped projects, verifiable certificates, and GitHub-ready work that speaks for you in interviews." },
  { title: "Careers as the KPI", body: "We measure success by placements, promotions, and salary growth — not enrollment counts." },
];

const stats = [
  { icon: GraduationCap, value: "1,200+", label: "Learners trained" },
  { icon: BriefcaseBusiness, value: "87%", label: "Career outcomes rate" },
  { icon: Globe2, value: "15+", label: "Countries reached" },
  { icon: MessagesSquare, value: "4.9/5", label: "Learner satisfaction" },
];

const instructors = [
  { name: "Senior Cloud Engineers", image: instructor1, tag: "AWS · Azure · GCP" },
  { name: "DevOps Practitioners", image: instructor2, tag: "Kubernetes · CI/CD" },
  { name: "AI & Data Specialists", image: instructor3, tag: "ML · Data Engineering" },
  { name: "Career Mentors", image: instructor4, tag: "Interviews · Placement" },
];

export default function About() {
  const { data: settings } = useSiteSettings();
  const brand = settings?.site_name || "Silicon Edge Consulting";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${brand}`,
    description: `Learn about ${brand}'s mission to deliver job-ready IT training.`,
    url: typeof window !== "undefined" ? `${window.location.origin}/about` : "/about",
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="About Silicon Edge Consulting | Global IT Training"
        description="Learn how Silicon Edge Consulting provides practical, project-driven IT training to learners worldwide — live cohorts, mentorship, and career support."
        canonical="https://siliconedgec.com/about"
        jsonLd={jsonLd}
      />
      <Header />

      {/* Hero — site-wide page hero pattern */}
      <section className="relative overflow-hidden bg-white pt-28 pb-14 md:pt-36 md:pb-20 border-b border-border/40">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.10),transparent_60%)]"
        />
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">Who we are</p>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
              About {brand}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              We exist to close the gap between learning and employment. {brand} combines live instruction,
              real-world projects, and dedicated career services so every learner graduates ready to ship —
              and ready to get hired.
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* Stats strip */}
        <section className="border-b border-border/40 bg-card/40 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(({ icon: Icon, value, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="text-center"
              >
                <div className="mx-auto mb-2 h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <p className="font-heading text-2xl sm:text-3xl font-bold">{value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Mission + image */}
        <section className="container mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">Our mission</p>
              <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-5 leading-tight">
                Talent is everywhere. Access to world-class training is not.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We started {brand} because too many capable people were stuck between expensive bootcamps
                that overpromise and cheap video courses that underdeliver. We build the third option:
                rigorous, mentor-led programs that are practical, affordable, and obsessively focused
                on employment outcomes.
              </p>
              <ul className="space-y-3 mt-6">
                {[
                  "Live cohorts with senior industry engineers",
                  "Hands-on labs on real cloud infrastructure",
                  "Career services from resume to offer letter",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm sm:text-base">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <div aria-hidden="true" className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/15 via-accent/10 to-gold/10 blur-2xl" />
              <img
                src={mentorStock}
                alt="A Silicon Edge mentor guiding a learner through a cloud engineering project"
                loading="lazy"
                className="relative rounded-2xl border border-border/60 shadow-xl w-full object-cover aspect-[4/3]"
              />
            </motion.div>
          </div>
        </section>

        {/* Values */}
        <section className="border-y border-border/40 bg-card/40 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 py-14 sm:py-20 max-w-6xl">
            <div className="max-w-2xl mb-10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">What we stand for</p>
              <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                Principles that shape every program
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {values.map(({ icon: Icon, title, body }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i, 4) * 0.06 }}
                  className="rounded-2xl border border-border/60 bg-card p-6 hover:border-primary/60 hover:shadow-lg transition-all"
                >
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-primary-foreground flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-heading text-lg font-bold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How we work */}
        <section className="container mx-auto px-4 sm:px-6 py-14 sm:py-20 max-w-6xl">
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">How we work</p>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
              A learning model built for outcomes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {approach.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i, 4) * 0.06 }}
                className="flex gap-4"
              >
                <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-heading font-bold flex items-center justify-center text-sm">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-heading text-base sm:text-lg font-bold mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Team strip */}
        <section className="border-y border-border/40 bg-card/40 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 py-14 sm:py-20 max-w-6xl">
            <div className="max-w-2xl mb-10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">The people</p>
              <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                Learn from practitioners, not presenters
              </h2>
              <p className="text-muted-foreground mt-3 text-sm sm:text-base leading-relaxed">
                Our instructors and mentors are working engineers and hiring insiders who teach what they
                use in production every day.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {instructors.map((inst, i) => (
                <motion.div
                  key={inst.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-primary/60 hover:shadow-lg transition-all"
                >
                  <img
                    src={inst.image}
                    alt={`${inst.name} at Silicon Edge Consulting`}
                    loading="lazy"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-heading text-sm sm:text-base font-bold">{inst.name}</h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{inst.tag}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Ready to start?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-sm sm:text-base">
            Explore the catalog, join a live cohort, or talk with our team about the right path for you.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link to="/courses">Browse Courses <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
