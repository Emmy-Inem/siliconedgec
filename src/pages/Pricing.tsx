import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Star } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SEO } from "@/components/SEO";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";
import { formatNaira } from "@/lib/format-currency";

const plans = [
  {
    name: "Beginner Courses",
    tagline: "Launch your tech journey.",
    tier: "All core features, including:",
    priceNgn: 100000,
    priceNote: "starting from",
    features: [
      "Access One Course",
      "Student Dashboard",
      "Class Recordings",
      "Course Certificate",
      "Support",
    ],
    highlight: false,
    cta: "Find Beginner Courses",
    accent: "gold",
    href: "/courses?level=beginner",
  },
  {
    name: "Intermediate Courses",
    tagline: "Build in-demand skills.",
    tier: "Everything in Starter, plus:",
    priceNgn: 600000,
    priceNote: "starting from",
    features: [
      "Access One Course",
      "Offline Content",
      "Offline Projects",
      "Career Workshop Access",
      "Career Support",
    ],
    highlight: true,
    cta: "Find Intermediate Courses",
    accent: "primary",
    href: "/courses?level=intermediate",
  },
  {
    name: "Advanced Courses",
    tagline: "Master advanced tech.",
    tier: "Everything in Individual, plus:",
    priceNgn: 800000,
    priceNote: "starting from",
    features: [
      "Access One Course",
      "Advanced Specialization",
      "Guided Portfolio Project",
      "Job Placement Support",
      "Career Support",
    ],
    highlight: false,
    cta: "Find Advanced Courses",
    accent: "teal",
    href: "/courses?level=advanced",
  },
];

const faqs = [
  {
    q: "What is the cost of an online course?",
    a: "Our course costs vary by track (Starter, Intermediate, Advanced) and payment plan (monthly or yearly). You can find detailed pricing and features above.",
  },
  {
    q: "What do I need to take a course?",
    a: "You'll need a stable internet connection, a computer (laptop or desktop), and a desire to learn! Specific software requirements for each course will be provided upon enrollment in your student dashboard.",
  },
  {
    q: "Can businesses enroll their staff in your courses?",
    a: "Absolutely! We offer tailored IT training solutions for businesses. Please visit our B2B Solutions page or click the \"Request a Custom Quote\" button on our pricing page to discuss a customized plan for your team.",
  },
  {
    q: "How do I access my course materials and monitor my progress?",
    a: "Upon enrollment, you'll gain access to your personalized Student Dashboard. This hub allows you to track course progress, access recordings, download resources, submit assignments, view personalized reminders, manage certifications, and communicate directly with your tutor.",
  },
  {
    q: "What do I receive for taking this course?",
    a: "Every student receives access to our instructor-led live classes, lifetime access to all class recordings and resources, real-life portfolio projects, and comprehensive job readiness training (for both local and remote roles). Upon successful completion, you'll earn an official Silicon Edge Consulting certificate.",
  },
  {
    q: "What will I get if I subscribe to this Certificate?",
    a: "Our certificates are not a subscription; they are earned upon the successful completion of a course. Earning a Silicon Edge Consulting certificate signifies verified expertise, validates your skills to employers, and enhances your career advancement prospects. Each certificate includes a unique verification ID for authenticity.",
  },
];

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
};
const sectionReveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { type: "spring" as const, stiffness: 60, damping: 20 },
};

export default function Pricing() {
  const { format: formatPrice, isNgn } = useLocalizedPrice();
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Course Pricing & Plans"
        description="Transparent pricing in Naira. Choose Beginner (₦100,000), Intermediate (₦600,000), or Advanced packages to match your career goals."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white pt-24 sm:pt-28 pb-12 sm:pb-16 border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--primary) / 0.14) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
          }}
        />
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        {/* Floating sparkle pills */}
        <motion.div
          aria-hidden
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="hidden md:flex absolute top-24 left-12 items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-primary/15 shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.4)] text-xs font-medium text-primary"
        >
          <span className="w-2 h-2 rounded-full bg-gold" /> Job-ready
        </motion.div>
        <motion.div
          aria-hidden
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="hidden md:flex absolute top-32 right-12 items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-primary/15 shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.4)] text-xs font-medium text-foreground"
        >
          <span className="w-2 h-2 rounded-full bg-primary" /> Cohort starts soon
        </motion.div>
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
            className="max-w-3xl mx-auto text-center"
          >
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-4">
              Pricing
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              Simple Pricing That Scales With Your{" "}
              <span className="text-gradient">Ambition</span>
              <span className="text-gold">.</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Invest in Yourself. Invest in Your Team. Unlock Unmatched Tech
              Expertise.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Choose Your Path */}
      <section className="py-8 bg-card border-y border-border">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading font-semibold text-base text-foreground">
            Choose Your Path to Mastery
          </h2>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto mt-2 leading-relaxed">
            Select the learning track that aligns with your career goals. All
            plans include our signature instructor-led classes, real-life
            portfolio projects, job readiness training, and lifetime access to
            course recordings and resources.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto"
          >
            {plans.map((plan) => {
              const accentBar =
                plan.accent === "gold"
                  ? "bg-gold"
                  : plan.accent === "teal"
                  ? "bg-teal-500"
                  : "bg-primary";
              const btnText =
                plan.accent === "gold"
                  ? "text-gold"
                  : plan.accent === "teal"
                  ? "text-teal-600"
                  : "text-primary-foreground";
              const btnBorder =
                plan.accent === "gold"
                  ? "border-gold/40 hover:border-gold"
                  : plan.accent === "teal"
                  ? "border-teal-400/50 hover:border-teal-500"
                  : "border-transparent";
              const btnBg = plan.highlight
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : `bg-card hover:bg-accent ${btnText} ${btnBorder}`;
              return (
                <motion.div
                  key={plan.name}
                  variants={staggerItem}
                  whileHover={{
                    y: -6,
                    transition: { duration: 0.25, ease: "easeOut" },
                  }}
                  className={`rounded-2xl border bg-card transition-all relative group flex flex-col ${
                    plan.highlight
                      ? "border-primary/40 shadow-2xl shadow-primary/20 md:scale-[1.03]"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -inset-3 -z-10 bg-gradient-to-br from-primary/30 via-accent/20 to-gold/20 rounded-3xl blur-2xl opacity-70 pointer-events-none" />
                  )}
                  {/* Top accent bar */}
                  <div className={`h-2.5 w-full rounded-t-2xl overflow-hidden ${accentBar}`} />

                  {plan.highlight && (
                    <div className="absolute top-5 right-5 bg-primary text-primary-foreground text-[10px] font-semibold px-3 py-1 rounded-full tracking-wide uppercase">
                      Most Popular
                    </div>
                  )}

                  {/* Header */}
                  <div className="p-6 sm:p-8 pb-5 sm:pb-6">
                    <h3 className="font-heading font-bold text-xl sm:text-2xl mb-2 text-foreground">
                      {plan.name}
                    </h3>
                    <p className="text-muted-foreground text-sm sm:text-base mb-4">
                      {plan.tagline}
                    </p>
                    {/* Price */}
                    <div className="mb-6">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                        {plan.priceNote}
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
                          {formatPrice(plan.priceNgn)}
                        </span>
                      </div>
                      {!isNgn && (
                        <p className="text-[11px] text-muted-foreground mt-1">{formatNaira(plan.priceNgn)} (NGN)</p>
                      )}
                    </div>
                    <Button
                      asChild
                      className={`w-full h-11 sm:h-12 border-2 font-semibold text-sm sm:text-base ${btnBg}`}
                    >
                      <Link to={plan.href}>{plan.cta}</Link>
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border mx-6 sm:mx-8" />

                  {/* Features */}
                  <div className="p-6 sm:p-8 pt-5 sm:pt-6 flex-1">
                    <p className="font-heading font-semibold text-sm sm:text-base mb-4 sm:mb-5 text-foreground">
                      {plan.tier}
                    </p>
                    <ul className="space-y-3 sm:space-y-3.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-3 text-sm">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          </span>
                          <span className="text-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* B2B CTA */}
          <motion.div
            {...sectionReveal}
            className="text-center mt-14"
          >
            <p className="text-muted-foreground text-sm mb-3">
              Need training for your entire team?
            </p>
            <Button variant="outline" asChild className="hover-scale">
              <Link to="/for-businesses">
                Request a Custom Quote <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>




      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div {...sectionReveal} className="text-center mb-10">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-2">
              Frequently asked questions, answered
              <span className="text-gold">.</span>
            </h2>
            <p className="text-muted-foreground text-sm">
              More questions? Visit the{" "}
              <Link
                to="/for-businesses"
                className="text-primary hover:underline font-medium"
              >
                Contact Page
              </Link>
              .
            </p>
          </motion.div>

          <motion.div {...sectionReveal}>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-medium">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
