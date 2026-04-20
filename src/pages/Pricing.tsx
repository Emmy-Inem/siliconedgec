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

const plans = [
  {
    name: "Beginner Courses",
    tagline: "Launch your tech journey.",
    tier: "All core features, including:",
    price: "₦100,000",
    features: [
      "Access One Course",
      "Student Dashboard",
      "Class Recordings",
      "Course Certificate",
      "Support",
    ],
    highlight: false,
    cta: "Get Started",
  },
  {
    name: "Intermediate Courses",
    tagline: "Build in-demand skills.",
    tier: "Everything in Starter, plus:",
    price: "₦600,000",
    features: [
      "Access One Course",
      "Offline Content",
      "Offline Projects",
      "Career Workshop Access",
      "Career Support",
    ],
    highlight: true,
    cta: "Start Learning",
  },
  {
    name: "Advanced Courses",
    tagline: "Master advanced tech.",
    tier: "Everything in Individual, plus:",
    price: "₦800,000",
    features: [
      "Access One Course",
      "Advanced Specialization",
      "Guided Portfolio Project",
      "Job Placement Support",
      "Career Support",
    ],
    highlight: false,
    cta: "Go Advanced",
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

const testimonials = [
  {
    name: "Sarah K.",
    role: "Cloud Administrator",
    quote:
      "Finally, a course I finished! The live tutors at Silicon Edge kept me on track. Built a solid portfolio, and their job readiness training helped me land a remote Cloud role fast. Game-changer.",
  },
  {
    name: "David C.",
    role: "Junior Software Engineer",
    quote:
      "Silicon Edge's support is top-notch. Tutors were always there. Lifetime access to recordings and real-life projects made learning effective. Now thriving in my Software Engineering role.",
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
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Pricing — Beginner to Advanced Tech Courses"
        description="Transparent pricing in Naira. Choose Beginner (₦100,000), Intermediate (₦600,000), or Advanced packages to match your career goals."
      />
      <Header />

      {/* Hero */}
      <section className="bg-hero relative overflow-hidden pt-28 pb-16">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(262_90%_68%/0.12),transparent_60%)]" />
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
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-hero mb-4 leading-tight">
              Simple Pricing That Scales With Your{" "}
              <span className="text-gradient">Ambition</span>
              <span className="text-gold">.</span>
            </h1>
            <p className="text-hero-muted text-lg max-w-xl mx-auto leading-relaxed">
              Invest in Yourself. Invest in Your Team. Unlock Unmatched Tech
              Expertise.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Choose Your Path */}
      <section className="py-6 bg-primary/5 border-y border-primary/10">
        <div className="container mx-auto px-4 text-center">
          <p className="font-heading font-semibold text-sm">
            Choose Your Path to Mastery
          </p>
          <p className="text-muted-foreground text-xs max-w-2xl mx-auto mt-1">
            Select the learning track that aligns with your career goals. All
            plans include our signature instructor-led classes, real-life
            portfolio projects, job readiness training, and lifetime access to
            course recordings and resources.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={staggerItem}
                whileHover={{
                  y: -10,
                  transition: { type: "spring", stiffness: 300 },
                }}
                className={`rounded-2xl border p-8 transition-all relative overflow-hidden group ${
                  plan.highlight
                    ? "bg-card border-primary shadow-xl shadow-primary/10"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.06),transparent_70%)]" />

                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="relative z-10">
                  <h3 className="font-heading font-bold text-xl mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {plan.tagline}
                  </p>
                  <div className="mb-2">
                    <span className="font-heading text-4xl font-bold">
                      {plan.price}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-6 font-medium">
                    {plan.tier}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.highlight ? "shimmer-btn" : ""}`}
                    variant={plan.highlight ? "default" : "outline"}
                    asChild
                  >
                    <Link to="/sign-up">
                      {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            ))}
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

      {/* Testimonials */}
      <section className="py-16 bg-hero relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <div className="container mx-auto px-4 relative">
          <motion.div {...sectionReveal} className="text-center mb-10">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">
              We build tech Careers
            </p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-hero mb-2">
              Our average call quality rating is 4.4 out of 5.
            </h2>
            <p className="text-hero-muted text-sm">
              That leads to happy tweets like these:
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto"
          >
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={staggerItem}
                whileHover={{ y: -5 }}
                className="glass-card rounded-xl border border-border p-6 space-y-4 hover:border-primary/20 hover:shadow-lg transition-all"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-accent text-accent"
                    />
                  ))}
                </div>
                <p className="text-sm text-hero-muted leading-relaxed italic">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-heading font-bold text-primary text-sm">
                      {t.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-sm text-hero">
                      {t.name}
                    </p>
                    <p className="text-xs text-hero-muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
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
