import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { Button } from "@/components/ui/button";
import {
  Zap, Layers, Award, Briefcase, CheckCircle2, ArrowRight,
  Cloud, Code, Shield, Palette, Globe, Brain, Quote, Loader2,
  Users, Building2, Rocket,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import businessTraining from "@/assets/stock/business-team.jpg";
import { SEO } from "@/components/SEO";
import { usePageImage } from "@/hooks/usePageImage";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const features = [
  { icon: Zap, title: "Live Classes", desc: "Interactive, expert-led sessions for real-time engagement and immediate answers." },
  { icon: Layers, title: "Learn on-the-go", desc: "Flexible access to recordings and resources, fitting any schedule." },
  { icon: Award, title: "Certificates", desc: "Validate skills with official, verifiable course completion documents." },
  { icon: Briefcase, title: "Real Projects", desc: "Build a strong portfolio with practical, industry-relevant assignments." },
];

const techCategories = [
  { icon: Cloud, title: "Cloud Platforms", desc: "AWS, Azure, Google Cloud, etc" },
  { icon: Code, title: "Programming Languages", desc: "Javascript, PHP, Swift, etc" },
  { icon: Shield, title: "Cybersecurity Tools", desc: "Pen Testing, Ethical hacking, etc" },
  { icon: Palette, title: "Product Design & UX/UI", desc: "Figma, Wireframing, Prototyping..." },
  { icon: Globe, title: "Website Design", desc: "Framer, Webflow, WordPress, etc" },
  { icon: Brain, title: "Data & AI", desc: "PyTorch, Tensorflow, SQL, etc" },
];

const packages = [
  {
    icon: Users,
    name: "Team Sprint",
    size: "5–15 learners",
    desc: "A focused 4–6 week cohort to upskill a single team on one stack.",
    points: ["1 curriculum track", "Live instructor sessions", "Slack/Teams support", "Completion certificates"],
  },
  {
    icon: Building2,
    name: "Department Rollout",
    size: "15–60 learners",
    desc: "Multi-track program with role-based learning paths and reporting.",
    points: ["Up to 3 tracks", "Custom learning paths", "Manager progress dashboards", "Capstone projects"],
    featured: true,
  },
  {
    icon: Rocket,
    name: "Enterprise Academy",
    size: "60+ learners",
    desc: "An always-on internal academy with onboarding, upskilling, and reskilling.",
    points: ["Unlimited tracks", "Dedicated success manager", "SSO + custom branding", "Quarterly skill audits"],
  },
];

const faqs = [
  {
    q: "How are the trainings delivered?",
    a: "Live instructor-led classes (Zoom or Google Meet) plus on-demand recordings, hands-on labs, and projects accessible from any device.",
  },
  {
    q: "Can the curriculum be tailored to our stack?",
    a: "Yes. Every engagement starts with a discovery call where we map your team's current skills, target roles, and tech stack to a custom syllabus.",
  },
  {
    q: "How is progress tracked and reported?",
    a: "Managers get a dashboard with per-learner progress, quiz scores, attendance, and final project grades. Monthly summary reports are emailed automatically.",
  },
  {
    q: "What does it cost?",
    a: "Pricing scales with cohort size, number of tracks, and program length. Submit the form below and we'll send a tailored quote within 24 hours.",
  },
  {
    q: "Do learners receive certificates?",
    a: "Yes — every learner who completes a track receives a verifiable Silicon Edge certificate with a unique verification code.",
  },
];

export default function ForBusinesses() {
  const heroImage = usePageImage("page_image_business_hero", businessTraining);
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    job_title: "",
    email: "",
    phone: "",
    company_size: "",
    training_focus: "",
    training_needs: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const trackLinkedInConversion = () => {
    try {
      const w = window as any;
      if (w.lintrk) {
        w.lintrk("track", { conversion_id: 30673009 });
      }
    } catch (e) {
      console.warn("LinkedIn conversion tracking failed", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = [
      "company_name",
      "contact_name",
      "job_title",
      "email",
      "phone",
      "training_focus",
    ] as const;
    const missing = required.filter((k) => !formData[k].trim());
    if (missing.length) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload = {
      company_name: formData.company_name.trim(),
      contact_name: formData.contact_name.trim(),
      job_title: formData.job_title.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      company_size: formData.company_size.trim() || null,
      training_needs: [formData.training_focus.trim(), formData.training_needs.trim()].filter(Boolean).join("\n\n"),
    };
    const { data: inserted, error } = await (supabase.from("business_leads") as any)
      .insert(payload)
      .select("id")
      .single();
    // Fan out: notify admins in-app and forward a copy to info@siliconedgec.com
    // (the lead row above is the on-site copy). Failures here must not block
    // the submitter — we've already saved the lead.
    if (!error && inserted?.id) {
      try {
        await supabase.functions.invoke("notify-business-lead", {
          body: {
            lead_id: inserted.id,
            ...payload,
          },
        });
      } catch (e) {
        console.warn("notify-business-lead failed", e);
      }
    }
    setSubmitting(false);
    if (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
    } else {
      setSubmitted(true);
      trackLinkedInConversion();
      toast({ title: "Request submitted!", description: "We'll be in touch shortly." });
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-card/10 text-hero placeholder:text-hero-muted";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Corporate AI, Cloud & DevOps Training for Teams | Silicon Edge"
        description="Scalable corporate IT training, cloud workshops, and workforce upskilling customized for engineering teams."
        canonical="https://siliconedgec.com/for-businesses"
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

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-white pt-28 pb-20 border-b border-border/40">
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
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: "easeOut" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-5">
                Corporate training partner
              </p>

              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-[1.05] tracking-tight">
                Give your workforce a <span className="text-gradient">winning edge</span><span className="text-gold">.</span>
              </h1>
              <p className="text-muted-foreground text-base md:text-lg mb-6 max-w-xl leading-relaxed">Custom-built tech training that turns your team into the team competitors fear.</p>
              <ul className="space-y-3 mb-8">
                {["Access several Tech Courses", "Course Progress Tracking", "Course Resources & Materials"].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "hsl(var(--gold))" }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" asChild className="hover-scale">
                  <a href="#contact-form">Sign up your business</a>
                </Button>
                <a href="#contact-form" className="text-primary font-medium text-sm hover:underline story-link">
                  Questions? Talk to an expert
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 2 }}
              transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
              className="relative hidden lg:block"
            >
              <div className="absolute -inset-6 bg-gradient-to-br from-primary/20 via-transparent to-gold/20 rounded-3xl blur-2xl" />
              <img
                src={heroImage}
                alt="Corporate team upskilling with Silicon Edge"
                className="relative rounded-2xl border border-primary/20 shadow-2xl shadow-primary/20 w-full max-w-lg ml-auto object-cover aspect-[5/4]"
                loading="eager"
              />
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 bg-card border border-border rounded-2xl p-3 shadow-2xl flex items-center gap-2.5 max-w-[200px]"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Cohort enrolled</p>
                  <p className="text-xs font-semibold">42 engineers · Q2</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Feature Grid ─── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          {/* Trust strip */}
          <motion.div
            {...fadeUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-5xl mx-auto mb-16"
          >
            {[
              { v: "50+", l: "Teams trained" },
              { v: "94%", l: "Completion rate" },
              { v: "12+", l: "Industries served" },
              { v: "24/7", l: "Mentor support" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 text-center hover:border-primary/30 transition-colors">
                <div className="font-heading text-2xl md:text-3xl font-bold text-gradient">{s.v}</div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="text-center md:text-left rounded-2xl border border-border/60 bg-card/40 p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20 flex items-center justify-center mb-4 mx-auto md:mx-0">
                  <item.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h2 className="font-heading font-semibold text-base mb-2">{item.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Onboard, Upskill, Retain ─── */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div {...fadeUp}>
            <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-4">Onboard, Upskill, Retain.</p>
            <h2 className="font-heading text-2xl md:text-4xl font-bold mb-4 leading-tight">
              Elevate your team's capabilities, driving innovation and growth.
            </h2>
            <p className="text-muted-foreground text-base mb-8 leading-relaxed">
              Empower your workforce, bridging skill gaps and fostering a culture of continuous innovation.
            </p>
            <ul className="space-y-3">
              {["Instructor-led training", "Customized programs", "Flexible delivery options", "Employee certifications"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "hsl(var(--gold))" }} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ─── Bullet Point Features ─── */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div {...fadeUp}>
            <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-4">Bullet Point Features</p>
            <h2 className="font-heading text-2xl md:text-4xl font-bold mb-4 leading-tight">
              Onboarding junior tech talent or growing your senior engineers?
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Enjoy a structured, practical, and scalable training designed to upgrade your workforce, without disrupting productivity.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Tech Solutions Grid (dark section) ─── */}
      <section className="py-20 bg-hero">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="font-medium text-xs tracking-[0.25em] uppercase mb-4" style={{ color: "hsl(var(--gold))" }}>
              Learn Any Tech Solution
            </p>
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-hero mb-3">
              Mastering Tomorrow's Tech, Today.
            </h2>
            <p className="text-hero-muted max-w-xl mx-auto">
              Gain proficiency in the leading technologies and software driving industry innovation.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {techCategories.map((cat, i) => (
              <motion.div
                key={cat.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                viewport={{ once: true }}
                className="rounded-xl border p-6 text-center hover:border-primary/40 transition-colors"
                style={{ borderColor: "hsl(var(--navy-light))", background: "hsl(var(--navy-light))" }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mx-auto mb-3">
                  <cat.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-sm text-hero mb-1">{cat.title}</h3>
                <p className="text-hero-muted text-xs">{cat.desc}</p>
              </motion.div>
            ))}
          </div>

          <p className="text-hero-muted text-center mt-8 text-sm">... and many more technologies</p>
        </div>
      </section>

      {/* ─── Programs / Packages ─── */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-4">Programs</p>
            <h2 className="font-heading text-2xl md:text-4xl font-bold mb-3 leading-tight">
              Pick a starting point. We'll tailor the rest.
            </h2>
            <p className="text-muted-foreground text-base">
              Three flexible engagement models, every one customised to your team's roles, stack, and goals.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {packages.map((p, i) => (
              <motion.div
                key={p.name}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                  p.featured
                    ? "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent shadow-lg shadow-primary/10"
                    : "border-border/60 bg-card/40 hover:border-primary/30"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-6 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-primary text-primary-foreground">
                    Most popular
                  </span>
                )}
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                  <p.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-heading font-bold text-lg mb-1">{p.name}</h3>
                <p className="text-xs text-primary font-medium mb-3">{p.size}</p>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{p.desc}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(var(--gold))" }} />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant={p.featured ? "default" : "outline"} className="w-full">
                  <a href="#contact-form">Request a quote</a>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-10">
            <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-4">FAQ</p>
            <h2 className="font-heading text-2xl md:text-4xl font-bold mb-3 leading-tight">
              Everything you might be wondering
            </h2>
          </motion.div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border/60">
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─── CTA + Contact Form ─── */}
      <section id="contact-form" className="py-20 bg-hero">
        <div className="container mx-auto px-4 text-center">
          <motion.div {...fadeUp}>
            <p className="font-medium text-xs tracking-[0.25em] uppercase mb-4" style={{ color: "hsl(var(--gold))" }}>
              Build a Future-Ready Team
            </p>
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-hero mb-3">
              Request Corporate Technology Training
            </h2>
            <p className="text-hero-muted mb-10 max-w-lg mx-auto">
              Tell us about your organisation's training needs and we'll recommend the right programme, delivery model and next steps.
            </p>
          </motion.div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto text-center py-12"
            >
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: "hsl(var(--gold))" }} />
              <h3 className="font-heading text-xl font-bold text-hero mb-2">Thank You!</h3>
              <p className="text-hero-muted">Your request has been submitted. Our team will reach out within 24 hours.</p>
            </motion.div>
          ) : (
            <motion.form
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="max-w-2xl mx-auto space-y-4 text-left"
              onSubmit={handleSubmit}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  name="company_name"
                  placeholder="Company Name *"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  style={{ borderColor: "hsl(var(--navy-light))" }}
                />
                <input
                  name="contact_name"
                  placeholder="Your Full Name *"
                  value={formData.contact_name}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  style={{ borderColor: "hsl(var(--navy-light))" }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  name="job_title"
                  placeholder="Job Title *"
                  value={formData.job_title}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  style={{ borderColor: "hsl(var(--navy-light))" }}
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Work Email *"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  style={{ borderColor: "hsl(var(--navy-light))" }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  name="phone"
                  type="tel"
                  placeholder="Phone Number *"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  style={{ borderColor: "hsl(var(--navy-light))" }}
                />
                <input
                  name="company_size"
                  placeholder="Team Size"
                  value={formData.company_size}
                  onChange={handleChange}
                  className={inputClass}
                  style={{ borderColor: "hsl(var(--navy-light))" }}
                />
              </div>
              <input
                name="training_focus"
                placeholder="What would you like your team to be trained in? *"
                value={formData.training_focus}
                onChange={handleChange}
                required
                className={inputClass}
                style={{ borderColor: "hsl(var(--navy-light))" }}
              />
              <textarea
                name="training_needs"
                placeholder="Tell us about your training needs"
                rows={4}
                value={formData.training_needs}
                onChange={handleChange}
                className={`${inputClass} resize-none`}
                style={{ borderColor: "hsl(var(--navy-light))" }}
              />
              <Button size="lg" className="w-full hover-scale" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Request Corporate Training Consultation <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.form>
          )}
        </div>
      </section>

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
