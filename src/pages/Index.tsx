import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowRight, BookOpen, Users, Award, Briefcase, ChevronRight, ChevronLeft, Star, Shield, GraduationCap, CheckCircle2, Zap, Heart, Sparkles, Clock4, Rocket, Trophy, BadgeCheck, Lock, MessageSquareQuote, PlayCircle, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CourseCard } from "@/components/CourseCard";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { useCourses } from "@/hooks/useCourses";
import { useHomeContent } from "@/hooks/useHomeContent";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoLight from "@/assets/logo-light.png";
import instructor1 from "@/assets/instructor-1.jpg";
import instructor2 from "@/assets/instructor-2.jpg";
import instructor3 from "@/assets/instructor-3.jpg";
import instructor4 from "@/assets/instructor-4.jpg";
import courseBanner from "@/assets/course-banner.png";
import { SEO } from "@/components/SEO";

function useTypewriter(words: string[], speed = 80, pause = 2000) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIndex];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          setText(word.slice(0, text.length + 1));
          if (text.length + 1 === word.length) {
            setTimeout(() => setIsDeleting(true), pause);
          }
        } else {
          setText(word.slice(0, text.length - 1));
          if (text.length === 0) {
            setIsDeleting(false);
            setWordIndex((i) => (i + 1) % words.length);
          }
        }
      },
      isDeleting ? speed / 2 : speed
    );
    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex, words, speed, pause]);

  return text;
}

function CountUp({ target, duration = 2 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const increment = target / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

const fallbackInstructorImages = [instructor1, instructor2, instructor3, instructor4];

const fallbackTestimonials = [
  { id: "fb1", name: "Sarah K.", role: "Cloud Administrator", quote: "Finally, a course I finished! The live tutors at Silicon Edge kept me on track. Built a solid portfolio, and their job readiness training helped me land a remote Cloud role fast. Game-changer.", avatar_url: null as string | null, rating: 5 },
  { id: "fb2", name: "David C.", role: "Junior Software Engineer", quote: "Silicon Edge's support is top-notch. Tutors were always there. Lifetime access to recordings and real-life projects made learning effective. Now thriving in my Software Engineering role.", avatar_url: null as string | null, rating: 5 },
];

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
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

export default function Index() {
  const { data: home } = useHomeContent();
  const { user } = useAuth();
  const { data: dbInstructors } = useQuery({
    queryKey: ["home-instructors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("instructors")
        .select("id, name, role, avatar_url, rating, students_count, courses_count")
        .order("created_at", { ascending: true })
        .limit(8);
      return data ?? [];
    },
  });
  const { data: dbTestimonials } = useQuery({
    queryKey: ["home-testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("id, name, role, quote, avatar_url, rating, order_index")
        .order("order_index", { ascending: true })
        .limit(20);
      return data ?? [];
    },
  });
  const instructors = (dbInstructors && dbInstructors.length > 0)
    ? dbInstructors.map((i, idx) => ({
        id: i.id,
        name: i.name,
        role: i.role ?? "Instructor",
        rating: Number(i.rating ?? 4.8),
        students: i.students_count ?? 0,
        courses: i.courses_count ?? 0,
        image: i.avatar_url || fallbackInstructorImages[idx % fallbackInstructorImages.length],
      }))
    : fallbackInstructorImages.map((image, idx) => ({
        id: `placeholder-${idx}`,
        name: ["Cloud Engineer", "DevOps Engineer", "Software Engineer", "AI/ML Specialist"][idx],
        role: "Industry Mentor",
        rating: 4.8,
        students: 0,
        courses: 0,
        image,
      }));
  const testimonials = (dbTestimonials && dbTestimonials.length > 0)
    ? dbTestimonials.map((t) => ({
        id: t.id,
        name: t.name,
        role: t.role ?? "Student",
        quote: t.quote,
        avatar_url: t.avatar_url,
        rating: t.rating ?? 5,
      }))
    : fallbackTestimonials;
  const typewriterWords = home?.typewriter_words ?? [
    "Cloud Engineering", "Software Engineering", "Artificial Intelligence",
    "Web Development", "Cybersecurity", "Data Science", "DevOps",
    "Product Design", "UI/UX Design",
  ];
  const typedText = useTypewriter(typewriterWords);
  const [activeCategory, setActiveCategory] = useState("All");
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { data: courses = [] } = useCourses();

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const categories = ["All", ...Array.from(new Set(courses.map((c) => c.category))).sort()];

  const filteredCourses =
    activeCategory === "All"
      ? courses
      : courses.filter((c) => c.category === activeCategory);

  const scrollCourses = (dir: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 340;
      scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Silicon Edge Consulting — Job-Ready Tech Training in AI, Cloud & DevOps"
        description="Master AI, Cloud, DevOps, Cybersecurity & Web Development through live, instructor-led training. Earn verified certificates and build real projects with industry veterans."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          name: "Silicon Edge Consulting",
          url: typeof window !== "undefined" ? window.location.origin : undefined,
          sameAs: ["https://siliconedgec.lovable.app"],
        }}
      />
      <Header />

      {/* Hero */}
      <section ref={heroRef} className="bg-hero relative overflow-hidden">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(276_100%_65%/0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(282_100%_68%/0.10),transparent_50%)]" />

        {/* Floating orbs */}
        <motion.div
          className="absolute top-20 right-[15%] w-64 h-64 rounded-full bg-primary/5 blur-3xl"
          animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-10 left-[10%] w-48 h-48 rounded-full bg-accent/5 blur-3xl"
          animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="container mx-auto px-4 pt-32 pb-20 md:pt-40 md:pb-28 relative">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
            className="max-w-3xl mx-auto text-center"
          >
            {/* Cloud provider logos */}
            <motion.div
              className="flex items-center justify-center gap-4 mb-8"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              {[
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg", alt: "Google Cloud" },
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg", alt: "Azure" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg", alt: "AWS" },
              ].map((logo, i) => (
                <motion.div
                  key={logo.alt}
                  variants={staggerItem}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl glass-card shadow-lg flex items-center justify-center p-2 border border-border/30"
                >
                  <img src={logo.src} alt={logo.alt} className="w-full h-full object-contain" />
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-primary font-medium text-sm tracking-widest uppercase mb-4"
            >
              {home?.hero_eyebrow ?? "Start Learning"}
            </motion.p>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl font-bold text-hero leading-tight mb-2 min-h-[2.5em] sm:min-h-[2em]">
              <span className="text-gradient">
                {typedText}
                <span className="inline-block w-[3px] h-[1em] bg-primary ml-1 align-middle animate-[typewriter-blink_1s_step-end_infinite]" />
              </span>
            </h1>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold text-hero mb-4">
              Unlock your tech career<span className="text-gold">.</span>
            </h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-hero-muted text-base sm:text-lg md:text-xl max-w-xl mx-auto mb-6 leading-relaxed"
            >
              {home?.hero_subtitle ?? "Live Online Courses. Hands-On Projects. Real Certifications."}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live cohort starting next week · Limited seats
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="flex flex-wrap justify-center gap-3"
            >
              <Button size="lg" asChild className="shimmer-btn text-primary-foreground hover-scale relative overflow-hidden">
                <Link to="/courses">
                  {home?.hero_cta_primary ?? "Explore Courses"} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {!user && (
                <Button size="lg" variant="outline" className="border-hero-muted/30 text-hero-muted hover:bg-navy-light hover:text-hero hover-scale" asChild>
                  <Link to="/sign-up">{home?.hero_cta_secondary ?? "Sign up now"}</Link>
                </Button>
              )}
            </motion.div>

            {/* Tech logos below CTA */}
            <motion.div
              className="flex items-center justify-center gap-4 mt-10"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              {[
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg", alt: "Python" },
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg", alt: "Angular" },
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg", alt: "JavaScript" },
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/openal/openal-original.svg", alt: "AI" },
              ].map((logo, i) => (
                <motion.div
                  key={logo.alt}
                  variants={staggerItem}
                  animate={{ y: [0, -7, 0] }}
                  transition={{ duration: 3.5 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: 0.5 + i * 0.25 }}
                  whileHover={{ scale: 1.2, y: -5 }}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl glass-card shadow-lg flex items-center justify-center p-2.5 border border-border/30"
                >
                  <img src={logo.src} alt={logo.alt} className="w-full h-full object-contain" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Alumni placement strip — trust */}
      <section className="border-y border-border/40 bg-card/40 backdrop-blur-sm py-7">
        <div className="container mx-auto px-4">
          <p className="text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-5">
            Our alumni now work at
          </p>
          <div className="relative overflow-hidden">
            <div className="flex animate-marquee gap-12 sm:gap-16 items-center" style={{ width: "max-content" }}>
              {[
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg", alt: "Google" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg", alt: "Microsoft" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg", alt: "AWS" },
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg", alt: "Azure" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/0/05/Meta_Platforms_Inc._logo_%28cropped%29.svg", alt: "Meta" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Flutterwave_Logo.png", alt: "Flutterwave" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/7/77/Andela_logo.svg", alt: "Andela" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/a/a9/IBM_logo.svg", alt: "IBM" },
              ].concat([
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg", alt: "Google" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg", alt: "Microsoft" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg", alt: "AWS" },
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg", alt: "Azure" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/0/05/Meta_Platforms_Inc._logo_%28cropped%29.svg", alt: "Meta" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Flutterwave_Logo.png", alt: "Flutterwave" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/7/77/Andela_logo.svg", alt: "Andela" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/a/a9/IBM_logo.svg", alt: "IBM" },
              ]).map((logo, i) => (
                <img
                  key={`${logo.alt}-${i}`}
                  src={logo.src}
                  alt={logo.alt}
                  className="h-7 sm:h-8 w-auto opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Learn with Silicon Edge */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div {...sectionReveal} className="text-center mb-4">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">{home?.why_eyebrow ?? "Why Learn with Silicon Edge"}</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              {(home?.why_title ?? "Build better skills, faster").split(/\s+/).map((word, idx, arr) => (
                <span key={idx}>
                  {idx === arr.length - 1 ? <span className="text-gradient">{word}</span> : `${word} `}
                </span>
              ))}
              <span className="text-gold">.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {home?.why_description ?? "We understand the challenges of breaking into or advancing in the tech industry."}
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14"
          >
            {[
              { icon: BookOpen, title: "Instructor-Led Learning", desc: "Live classes mean active participation, instant answers, and continuous support." },
              { icon: Award, title: "Built for Completion", desc: "Structured, tutor-led learning ensures course completion and no drop-outs." },
              { icon: Briefcase, title: "Skills That Get You Hired", desc: "Industry-aligned curriculum builds practical skills and real-life projects." },
              { icon: Zap, title: "Beyond Certification", desc: "Job training equips you for local and remote IT roles." },
            ].map((prop, propIdx) => (
              <motion.div
                key={prop.title}
                variants={staggerItem}
                whileHover={{ y: -8, transition: { type: "spring", stiffness: 300 } }}
                className="glass-card rounded-xl border border-border p-7 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/8 transition-all group relative overflow-hidden"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.08),transparent_70%)]" />
                <motion.div
                  animate={{ rotate: [0, -6, 6, 0], y: [0, -3, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: propIdx * 0.4 }}
                  whileHover={{ scale: 1.15, rotate: 0 }}
                  className="animate-icon-pulse w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors relative z-10"
                >
                  <prop.icon className="h-6 w-6 text-primary" />
                </motion.div>
                <h3 className="font-heading font-semibold text-base mb-2 relative z-10">{prop.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed relative z-10">{prop.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>


      {/* Browse Categories - Horizontal Scroll Courses */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div {...sectionReveal}>
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">{home?.categories_eyebrow ?? "Browse Categories"}</p>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <h2 className="font-heading text-3xl md:text-4xl font-bold mb-2">{home?.categories_title ?? "The world's top courses"}</h2>
                <p className="text-muted-foreground">{home?.categories_description ?? "We keep adding new online video courses with new additions published every month."}</p>
              </div>
              <Link to="/courses" className="text-primary font-medium text-sm flex items-center hover:underline hover-scale">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </motion.div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <motion.button
                key={cat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {cat}
              </motion.button>
            ))}
          </div>

          {/* Horizontal scroll */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => scrollCourses("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all -ml-3"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => scrollCourses("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all -mr-3"
            >
              <ChevronRight className="h-5 w-5" />
            </motion.button>

            <div
              ref={scrollRef}
              className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {filteredCourses.map((course, i) => (
                <div key={course.id} className="min-w-[300px] max-w-[320px] snap-start flex-shrink-0">
                  <CourseCard course={course} index={i} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works — 4 step roadmap */}
      <section className="py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_70%)]" />
        <div className="container mx-auto px-4 relative">
          <motion.div {...sectionReveal} className="text-center mb-16">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">How it works</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              From <span className="text-gradient">curious</span> to <span className="text-gradient">hired</span><span className="text-gold">.</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">A four-step path designed by hiring managers, not just educators.</p>
          </motion.div>

          <div className="relative">
            <div className="hidden lg:block absolute top-12 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
            >
              {[
                { n: "01", icon: Sparkles, title: "Apply & enroll", desc: "Pick your track. Pay flexibly. Get instant access to your cohort space." },
                { n: "02", icon: Clock4, title: "Learn live, weekly", desc: "Join real, instructor-led classes with Q&A. Recordings keep you on track." },
                { n: "03", icon: Rocket, title: "Build real projects", desc: "Ship portfolio-grade work reviewed by mentors actively working in tech." },
                { n: "04", icon: Trophy, title: "Get job-ready", desc: "CV reviews, mock interviews, and intros to our hiring partner network." },
              ].map((step) => (
                <motion.div key={step.n} variants={staggerItem} className="relative">
                  <div className="relative z-10 bg-card rounded-2xl border border-border/60 p-6 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center ring-1 ring-primary/20">
                        <step.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-heading text-3xl font-bold text-gradient leading-none">{step.n}</span>
                    </div>
                    <h3 className="font-heading font-semibold text-base mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* World-class Instructors */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div {...sectionReveal} className="text-center mb-14">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">World-class Instructors</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
               Classes Taught by <span className="text-gradient">Industry Experts</span><span className="text-gold">.</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Silicon Edge teachers are icons, experts, and industry rock stars excited to share their experience, wisdom, and trusted tools with you.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {instructors.map((inst) => (
              <motion.div
                key={inst.id}
                variants={staggerItem}
                whileHover={{ y: -10, transition: { type: "spring", stiffness: 300 } }}
                className="bg-card rounded-xl border border-border p-6 text-center hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/20 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_30%,hsl(var(--primary)/0.06),transparent_70%)]" />
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 ring-2 ring-transparent group-hover:ring-primary/30 transition-all relative z-10"
                >
                  <img src={inst.image} alt={inst.name} className="w-full h-full object-cover" />
                </motion.div>
                <h3 className="font-heading font-semibold relative z-10">{inst.name}</h3>
                <p className="text-muted-foreground text-sm mt-1 relative z-10">{inst.role}</p>
                <div className="flex items-center justify-center gap-1 mt-3 relative z-10">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span className="text-sm font-medium">{inst.rating}</span>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground relative z-10"
                >
                  <span>{inst.students.toLocaleString()} Students</span>
                  <span>{inst.courses} Courses</span>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Meet Your Mentors */}
      <section className="py-20 bg-hero relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div {...sectionReveal}>
              <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">Meet Your Mentors</p>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-hero mb-6">
                Guiding Your Tech Journey<span className="text-gold">.</span>
              </h2>
              <p className="text-hero-muted leading-relaxed mb-8">
                At Silicon Edge Consulting, your success is our mission, and our tutors are the heart of that commitment. They are more than just instructors; they are dedicated mentors, industry veterans, and passionate educators committed to empowering your growth.
              </p>
              <div className="space-y-5">
                {[
                  { icon: Shield, title: "Industry Veterans", desc: "Seasoned professionals sharing current insights and best practices." },
                  { icon: Heart, title: "Dedicated Support", desc: "Personalized guidance, answering questions, and constructive feedback." },
                  { icon: CheckCircle2, title: "Practical Application Focus", desc: "Hands-on projects and real-world scenarios for confident skill application." },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 80, delay: i * 0.15 }}
                    viewport={{ once: true }}
                    whileHover={{ x: 8 }}
                    className="flex gap-4"
                  >
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0"
                    >
                      <item.icon className="h-5 w-5 text-primary" />
                    </motion.div>
                    <div>
                      <h4 className="font-heading font-semibold text-hero text-sm">{item.title}</h4>
                      <p className="text-hero-muted text-sm mt-0.5">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 60, damping: 20 }}
              whileHover={{ scale: 1.02, rotate: 1 }}
              className="rounded-2xl overflow-hidden border border-primary/10 glow-purple"
            >
              <img src={courseBanner} alt="Cloud Engineering Crash Course" className="w-full h-full object-cover" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 overflow-hidden">
        {/* Trust badges row */}
        <div className="container mx-auto px-4 mb-16">
          <motion.div
            {...sectionReveal}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4"
          >
            {[
              { icon: BadgeCheck, label: "Verified Certificates" },
              { icon: Shield, label: "7-Day Money-Back" },
              { icon: GraduationCap, label: "Industry Mentors" },
              { icon: PlayCircle, label: "Live + Recorded" },
              { icon: Lock, label: "Secure Payments" },
            ].map((b) => (
              <div
                key={b.label}
                className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur hover:border-primary/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <b.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs sm:text-sm font-medium leading-tight">{b.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="container mx-auto px-4">
          <motion.div {...sectionReveal} className="text-center mb-14">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">Testimonials</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Don't just take <span className="text-gradient">our word for it</span>.
            </h2>
            <p className="text-muted-foreground">Join thousands learning on Silicon Edge</p>
          </motion.div>

          <div className="relative group/marquee">
            <div className="flex animate-marquee gap-6 group-hover/marquee:[animation-play-state:paused]" style={{ width: "max-content" }}>
              {[...testimonials, ...testimonials].map((t, i) => (
                <motion.div
                  key={`${t.id}-${i}`}
                  whileHover={{ y: -5, transition: { type: "spring", stiffness: 300 } }}
                  className="w-[340px] glass-card rounded-xl border border-border p-6 space-y-4 flex-shrink-0 hover:border-primary/20 hover:shadow-lg transition-all"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating ?? 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    {t.avatar_url ? (
                      <img src={t.avatar_url} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-heading font-bold text-primary text-sm">
                          {t.name.split(" ").map(n => n[0]).join("")}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-heading font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ — handle objections */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div {...sectionReveal} className="text-center mb-10">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">Frequently asked</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">
              Everything you need to know<span className="text-gold">.</span>
            </h2>
            <p className="text-muted-foreground">Still curious? Reach out — real humans reply.</p>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-3">
            {[
              { q: "Is this for absolute beginners?", a: "Yes. Most of our students start from zero. We pace foundational concepts before pushing into advanced, hands-on work." },
              { q: "Do I need a degree to enroll?", a: "No. We care about commitment, not credentials. Many of our top alumni were career switchers with no prior tech background." },
              { q: "What if I miss a live class?", a: "Every session is recorded and available for life. Replay at your own pace and ask questions in the cohort channel." },
              { q: "Will you actually help me get a job?", a: "Yes. CV reviews, mock interviews, portfolio polish, and warm intros to our hiring partners are part of every track." },
              { q: "How do payments work?", a: "Pay in full or split into installments. Cards, Paystack, and bank transfer are supported. Promo codes apply at checkout." },
              { q: "Can my employer sponsor me?", a: "Absolutely. Visit our Business page for invoiced corporate plans and team training options." },
            ].map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border/60 rounded-xl bg-card px-5 data-[state=open]:border-primary/30 data-[state=open]:shadow-md transition-all"
              >
                <AccordionTrigger className="font-heading text-left text-base hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-hero py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="container mx-auto px-4 text-center relative">
          <motion.div {...sectionReveal}>
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">Start your learning journey today</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-hero mb-4">
              Start Building your tech career
            </h2>
            <p className="text-hero-muted max-w-lg mx-auto mb-8">
              Effective learning starts with assessment. Learning a new skill is hard work, Silicon Edge makes it easier.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" asChild className="shimmer-btn text-primary-foreground relative overflow-hidden">
                <Link to="/courses">
                  Browse Courses <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
