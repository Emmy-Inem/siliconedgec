import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, useReducedMotion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, Award, Briefcase, ChevronRight, ChevronLeft, Star, Shield, GraduationCap, CheckCircle2, Zap, Heart, Sparkles, Clock4, Rocket, Trophy, BadgeCheck, Lock, PlayCircle, Users, Globe2, MessageCircle, Quote, Mouse } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CourseCard } from "@/components/CourseCard";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { useCourses } from "@/hooks/useCourses";
import { useHomeContent } from "@/hooks/useHomeContent";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import instructor1 from "@/assets/stock/instructor-1.jpg";
import instructor2 from "@/assets/stock/instructor-2.jpg";
import instructor3 from "@/assets/stock/instructor-3.jpg";
import instructor4 from "@/assets/stock/instructor-4.jpg";
import mentorStock from "@/assets/stock/mentor.jpg";
import { SEO } from "@/components/SEO";

/* ----------------------------- helpers ----------------------------- */

function useTypewriter(words: string[], typeSpeed = 90, deleteSpeed = 45, pause = 1500) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("typing");

  useEffect(() => {
    if (!words || words.length === 0) return;
    const word = words[wordIndex % words.length] ?? "";

    if (phase === "pausing") {
      const t = setTimeout(() => setPhase("deleting"), pause);
      return () => clearTimeout(t);
    }

    if (phase === "typing") {
      if (text === word) {
        setPhase("pausing");
        return;
      }
      const t = setTimeout(() => {
        setText(word.slice(0, text.length + 1));
      }, typeSpeed);
      return () => clearTimeout(t);
    }

    // deleting
    if (text === "") {
      setWordIndex((i) => (i + 1) % words.length);
      setPhase("typing");
      return;
    }
    const t = setTimeout(() => {
      setText(word.slice(0, text.length - 1));
    }, deleteSpeed);
    return () => clearTimeout(t);
  }, [text, wordIndex, phase, words, typeSpeed, deleteSpeed, pause]);

  return text;
}

function CountUp({ target, duration = 1.8, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setCount(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ----------------------------- magnetic button ----------------------------- */

function MagneticButton({ children, className = "", asChild = false, ...rest }: React.ComponentProps<typeof Button>) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });
  const reduce = useReducedMotion();

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.25);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.25);
  };
  const handleLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} style={{ x: sx, y: sy }} className="inline-block">
      <Button asChild={asChild} className={className} {...rest}>{children}</Button>
    </motion.div>
  );
}

/* ----------------------------- hero collage card ----------------------------- */

function TiltCollage({ instructors }: { instructors: { name: string; role: string; image: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 12 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 12 });
  const reduce = useReducedMotion();

  const handle = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => { mx.set(0); my.set(0); };

  const cards = instructors.slice(0, 4);
  const positions = [
    { top: "0%",  left: "8%",  rot: -6, z: 30, w: "55%", delay: 0.1 },
    { top: "10%", left: "48%", rot: 5,  z: 20, w: "48%", delay: 0.2 },
    { top: "48%", left: "0%",  rot: -3, z: 25, w: "50%", delay: 0.3 },
    { top: "52%", left: "52%", rot: 7,  z: 15, w: "46%", delay: 0.4 },
  ];

  return (
    <div ref={ref} onMouseMove={handle} onMouseLeave={reset} className="relative w-full aspect-square max-w-[520px] mx-auto" style={{ perspective: 1200 }}>
      {/* rotating glow */}
      <motion.div
        className="absolute inset-[12%] rounded-full bg-gradient-to-tr from-primary/40 via-accent/20 to-gold/30 blur-3xl opacity-60"
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />
      <motion.div style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }} className="absolute inset-0">
        {cards.map((inst, i) => {
          const p = positions[i];
          return (
            <motion.div
              key={inst.name + i}
              initial={{ opacity: 0, y: 40, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: p.rot }}
              transition={{ delay: p.delay, type: "spring", stiffness: 70, damping: 14 }}
              whileHover={{ scale: 1.05, rotate: 0, zIndex: 50 }}
              className="absolute rounded-2xl overflow-hidden border border-border/40 shadow-2xl glass-card"
              style={{ top: p.top, left: p.left, width: p.w, zIndex: p.z, transform: `translateZ(${p.z}px)` }}
            >
              <img src={inst.image} alt={inst.name} className="w-full aspect-[4/5] object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                <p className="text-white text-xs font-semibold leading-tight">{inst.name}</p>
                <p className="text-white/70 text-[10px]">{inst.role}</p>
              </div>
            </motion.div>
          );
        })}
        {/* floating UI snippet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
          className="absolute -bottom-4 -left-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-card border border-border shadow-xl"
          style={{ transform: "translateZ(60px)" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium">Live class · 24 online</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.75, type: "spring" }}
          className="absolute -top-3 right-2 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-card border border-border shadow-xl"
          style={{ transform: "translateZ(60px)" }}
        >
          <Trophy className="h-3.5 w-3.5 text-gold" />
          <span className="text-[11px] font-medium">Project graded · A+</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ----------------------------- floating tech logos (hero) ----------------------------- */

type TechLogo = { name: string; src: string; tag: string };

const HERO_TECH_LOGOS: TechLogo[] = [
  { name: "AWS",          tag: "Cloud",  src: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" },
  { name: "Azure",        tag: "Cloud",  src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg" },
  { name: "Google Cloud", tag: "Cloud",  src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg" },
  { name: "OpenAI",       tag: "AI",     src: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" },
  { name: "Gemini",       tag: "AI",     src: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" },
  { name: "TensorFlow",   tag: "ML",     src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg" },
  { name: "Python",       tag: "Code",   src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
  { name: "React",        tag: "Web",    src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" },
  { name: "Docker",       tag: "DevOps", src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" },
  { name: "Kubernetes",   tag: "DevOps", src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg" },
  { name: "GitHub",       tag: "Code",   src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" },
  { name: "TypeScript",   tag: "Code",   src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" },
];

/** Scattered, gently-floating tech logo cards that surround the hero headline (quso.ai style). */
function FloatingTechLogos() {
  const reduce = useReducedMotion();

  // Edge-hugging positions that keep the headline area clear.
  const positions = [
    { top: "10%", left: "6%",  size: 3.4, dur: 9,  delay: 0,   rot: -6, mobile: true  },
    { top: "20%", left: "92%", size: 3.4, dur: 12, delay: 0.1, rot: 6,  mobile: true  },
    { top: "54%", left: "4%",  size: 3.6, dur: 13, delay: 0.3, rot: 4,  mobile: true  },
    { top: "62%", left: "94%", size: 3.4, dur: 11, delay: 0.2, rot: -5, mobile: true  },
    { top: "12%", left: "24%", size: 2.6, dur: 11, delay: 0.4, rot: 6,  mobile: false },
    { top: "10%", left: "76%", size: 2.6, dur: 10, delay: 0.6, rot: -4, mobile: false },
    { top: "84%", left: "16%", size: 2.8, dur: 12, delay: 0.7, rot: 3,  mobile: false },
    { top: "88%", left: "82%", size: 3.0, dur: 11, delay: 0.5, rot: 6,  mobile: false },
    { top: "78%", left: "48%", size: 2.6, dur: 9,  delay: 0.1, rot: -7, mobile: false },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {HERO_TECH_LOGOS.slice(0, positions.length).map((logo, i) => {
        const p = positions[i];
        return (
          <motion.div
            key={logo.name}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.06, type: "spring", stiffness: 80, damping: 14 }}
            className={`absolute ${p.mobile ? "" : "hidden md:block"}`}
            style={{ top: p.top, left: p.left, transform: "translate(-50%, -50%)" }}
          >
            <motion.div
              animate={reduce ? {} : { y: [0, -10, 0], rotate: [p.rot, p.rot + 3, p.rot] }}
              transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-2xl bg-white border border-primary/10 shadow-[0_10px_30px_-14px_hsl(var(--primary)/0.35)] p-2 flex items-center justify-center"
              style={{ width: `${p.size}rem`, height: `${p.size}rem` }}
            >
              <img
                src={logo.src}
                alt={logo.name}
                loading="lazy"
                className="max-w-full max-h-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ----------------------------- bento tiles ----------------------------- */

function ChatBubbleTile() {
  const messages = [
    { who: "Mentor", text: "Today: deploy a fault-tolerant VPC across 3 AZs on AWS.", side: "left" as const },
    { who: "You",    text: "Should the NAT gateway be per-AZ or shared?", side: "right" as const },
    { who: "Mentor", text: "Per-AZ. Shared NAT = single point of failure + cross-AZ data charges.", side: "left" as const },
    { who: "You",    text: "Got it. Pushing my Terraform module now 🚀", side: "right" as const },
    { who: "Mentor", text: "Nice. I'll review the IAM least-privilege policies in 5min live.", side: "left" as const },
  ];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((v) => (v + 1) % messages.length), 2800); return () => clearInterval(t); }, []);
  return (
    <div className="space-y-2 mt-5 min-h-[180px]">
      <AnimatePresence mode="popLayout">
        {messages.slice(Math.max(0, i - 2), i + 1).map((m, k) => (
          <motion.div
            key={`${m.text}-${k}-${i}`}
            layout
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`max-w-[85%] text-xs px-3 py-2 rounded-2xl ${m.side === "left" ? "bg-muted text-foreground rounded-bl-sm" : "ml-auto bg-primary text-primary-foreground rounded-br-sm"}`}
          >
            {m.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function RadialProgressTile({ value = 92 }: { value?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => { if (inView) setV(value); }, [inView, value]);
  const C = 2 * Math.PI * 42;
  return (
    <div className="relative mt-4 flex items-center justify-center">
      <svg ref={ref} viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
        <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
        <motion.circle
          cx="50" cy="50" r="42" stroke="hsl(var(--primary))" strokeWidth="8" fill="none"
          strokeLinecap="round" strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (C * v) / 100 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-heading text-2xl font-bold text-gradient"><CountUp target={v} duration={1.6} suffix="%" /></span>
      </div>
    </div>
  );
}

function SkillChipsTile() {
  const skills = ["AWS", "Python", "Kubernetes", "React", "TensorFlow", "Docker", "Terraform", "TypeScript"];
  return (
    <div className="flex flex-wrap gap-1.5 mt-4">
      {skills.map((s, i) => (
        <motion.span
          key={s}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, type: "spring" }}
          whileHover={{ y: -3, scale: 1.06 }}
          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
        >
          {s}
        </motion.span>
      ))}
    </div>
  );
}

function AvatarStackTile({ avatars }: { avatars: string[] }) {
  return (
    <div className="flex items-center mt-5">
      {avatars.slice(0, 5).map((a, i) => (
        <motion.img
          key={i}
          src={a}
          alt=""
          initial={{ x: -10, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          className="w-9 h-9 rounded-full ring-2 ring-card object-cover"
          style={{ marginLeft: i === 0 ? 0 : -10 }}
        />
      ))}
      <motion.div
        initial={{ x: -10, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="ml-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold"
      >
        +2,000 learners
      </motion.div>
    </div>
  );
}

/* ----------------------------- defaults ----------------------------- */

const fallbackInstructorImages = [instructor1, instructor2, instructor3, instructor4];

/* ----------------------------- vertical testimonial marquee ----------------------------- */

type Tm = { id: string; name: string; role: string; quote: string; avatar_url: string | null; rating: number };

function TestimonialCard({ t }: { t: Tm }) {
  return (
    <div className="glass-card rounded-2xl border border-border/60 p-5 hover:border-primary/30 transition-colors relative w-[300px] sm:w-[340px] shrink-0">
      <Quote className="absolute top-3 right-3 h-5 w-5 text-primary/15" />
      <div className="flex gap-0.5 mb-2.5">
        {Array.from({ length: t.rating ?? 5 }).map((_, j) => (
          <Star key={j} className="h-3.5 w-3.5 fill-gold text-gold" />
        ))}
      </div>
      <p className="text-sm leading-relaxed text-foreground/90 mb-4">"{t.quote}"</p>
      <div className="flex items-center gap-3">
        {t.avatar_url ? (
          <img src={t.avatar_url} alt={t.name} loading="lazy" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="font-heading font-bold text-primary text-xs">
              {t.name.split(" ").map((n) => n[0]).join("")}
            </span>
          </div>
        )}
        <div>
          <p className="font-heading font-semibold text-sm">{t.name}</p>
          <p className="text-[11px] text-muted-foreground">{t.role}</p>
        </div>
      </div>
    </div>
  );
}

function VerticalTestimonialMarquee({ testimonials, speed = "normal" }: { testimonials: Tm[]; speed?: string }) {
  /* Ensure we have enough cards for a seamless loop. */
  const pool: Tm[] = [...testimonials];
  while (pool.length > 0 && pool.length < 8) {
    pool.push(...testimonials.map((t, i) => ({ ...t, id: `${t.id}-r${pool.length + i}` })));
  }
  const duration = speed === "slow" ? 160 : speed === "fast" ? 50 : 90;

  return (
    <div className="relative overflow-hidden mask-fade-x marquee-pause">
      <div
        className="marquee-track flex gap-5 w-max"
        style={{
          animation: `marquee ${duration}s linear infinite`,
          willChange: "transform",
        }}
      >
        {[...pool, ...pool].map((t, k) => (
          <TestimonialCard key={`${t.id}-${k}`} t={t} />
        ))}
      </div>
    </div>
  );
}

const fallbackTestimonials = [
  { id: "fb1", name: "Sarah K.", role: "Cloud Administrator", quote: "Finally, a course I finished. The live tutors kept me on track and the projects landed me a remote Cloud role. Game-changer.", avatar_url: null as string | null, rating: 5 },
  { id: "fb2", name: "David C.", role: "Junior Software Engineer", quote: "Support is top-notch. Tutors were always there. Lifetime access and real projects made learning effective.", avatar_url: null as string | null, rating: 5 },
  { id: "fb3", name: "Aisha M.", role: "DevOps Engineer", quote: "Switched careers in 7 months. The mock interviews were brutal in the best way. Worth every naira.", avatar_url: null as string | null, rating: 5 },
  { id: "fb4", name: "Tunde O.", role: "Data Analyst", quote: "Cohort energy is unreal. I built a portfolio I'm actually proud to show recruiters.", avatar_url: null as string | null, rating: 5 },
  { id: "fb5", name: "Priya R.", role: "Software Engineer", quote: "Mentors from Google and AWS. The bar is very high here, and that's exactly what I needed.", avatar_url: null as string | null, rating: 5 },
  { id: "fb6", name: "Kwame A.", role: "ML Engineer", quote: "Real projects, real reviews. No fluff. The career support after the course is what closed the deal for me.", avatar_url: null as string | null, rating: 5 },
];

const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const staggerItem = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 16 } } };
const sectionReveal = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { type: "spring" as const, stiffness: 60, damping: 20 },
};

/* ----------------------------- main ----------------------------- */

export default function Index() {
  const { data: home } = useHomeContent();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const { data: settings } = useSiteSettings();
  const communityUrl = settings?.whatsapp_community_url || (settings?.whatsapp_number ? `https://wa.me/${settings.whatsapp_number}` : "#");

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
  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [students, courses, instructors] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("instructors").select("id", { count: "exact", head: true }),
      ]);
      return {
        students: Math.max(students.count ?? 0, 2000),
        courses: Math.max(courses.count ?? 0, 24),
        instructors: Math.max(instructors.count ?? 0, 30),
        countries: 18,
      };
    },
  });

  /* admin overrides take precedence; otherwise live counts */
  const parseOverride = (v?: string) => {
    if (!v) return null;
    const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const displayStats = {
    students: parseOverride(home?.stat_students) ?? stats?.students ?? 2000,
    courses: parseOverride(home?.stat_courses) ?? stats?.courses ?? 24,
    instructors: parseOverride(home?.stat_instructors) ?? stats?.instructors ?? 30,
    countries: parseOverride(home?.stat_countries) ?? stats?.countries ?? 18,
  };

  const baseInstructors = (dbInstructors && dbInstructors.length > 0)
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
        name: ["Adaeze N.", "Marcus L.", "Sofia P.", "Rahul K."][idx],
        role: ["Cloud Architect", "DevOps Lead", "Senior Software Engineer", "AI/ML Specialist"][idx],
        rating: 4.9,
        students: 0,
        courses: 0,
        image,
      }));

  /* admin can override the 4 hero collage images by URL */
  const heroOverrides = [home?.hero_image_1, home?.hero_image_2, home?.hero_image_3, home?.hero_image_4];
  const instructors = baseInstructors.map((inst, idx) => {
    const override = heroOverrides[idx];
    return override && override.trim().length > 0 ? { ...inst, image: override } : inst;
  });

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

  /* page scroll progress */
  const { scrollYProgress: pageProgress } = useScroll();
  const progressX = useTransform(pageProgress, [0, 1], ["0%", "100%"]);

  /* hero parallax */
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  /* timeline scroll */
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: timelineProgress } = useScroll({ target: timelineRef, offset: ["start 80%", "end 20%"] });
  const lineScale = useSpring(timelineProgress, { stiffness: 80, damping: 20 });

  const categories = ["All", ...Array.from(new Set(courses.map((c) => c.category))).sort()];
  const filteredCourses = activeCategory === "All" ? courses : courses.filter((c) => c.category === activeCategory);

  const scrollCourses = (dir: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 340;
      scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    }
  };

  const heroAvatars = instructors.slice(0, 5).map((i) => i.image);

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

      {/* page scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] origin-left z-[60] bg-gradient-to-r from-primary via-accent to-gold"
        style={{ scaleX: pageProgress }}
      />

      {/* ───────────────── HERO (light, premium) ───────────────── */}
      <section ref={heroRef} className="relative overflow-hidden bg-white">
        {/* soft purple hue background — top-only, very subtle */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_55%)]" />
        {/* faint dot grid */}
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--primary) / 0.14) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 85%)",
          }}
        />

        {/* floating tech logos behind the headline */}
        <FloatingTechLogos />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="container mx-auto px-4 pt-24 pb-14 md:pt-36 md:pb-28 relative"
        >
          <div className="max-w-3xl mx-auto text-center relative z-10">
            {/* eyebrow pill */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6"
            >
              <Sparkles className="h-3 w-3" /> {home?.hero_eyebrow ?? "Live, instructor-led tech training"}
            </motion.div>

            {/* center brand mark — favicon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 90, damping: 14 }}
              className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-white border border-primary/15 shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.4)] flex items-center justify-center"
            >
              <img src="/favicon.png" alt="Silicon Edge Consulting" className="w-9 h-9 object-contain" />
            </motion.div>

            <h1
              className="font-heading font-bold text-foreground leading-[1.02] tracking-tight mb-5 text-balance"
              style={{ fontSize: "clamp(1.85rem, 7.5vw, 4.75rem)" }}
            >
              <motion.span
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 60, damping: 18 }}
                className="block"
              >
                {home?.hero_title_pre ?? "Start Learning"}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.1 }}
                className="block text-gradient"
              >
                {typedText}
                <span className="inline-block w-[6px] h-[0.85em] bg-primary ml-2 align-middle animate-[typewriter-blink_1s_step-end_infinite]" />
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.2 }}
                className="block"
              >
                {home?.hero_title_post ?? "Unlock your tech career"}<span className="text-primary">.</span>
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-7"
            >
              {home?.hero_subtitle ?? "Live online courses. Hands-on projects. Verified certificates. Built by engineers who hire engineers."}
            </motion.p>

            {/* honest social proof pill */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="inline-flex items-center gap-2 sm:gap-3 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white border border-primary/15 shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.3)] mb-8"
            >
              <div className="flex -space-x-1.5 sm:-space-x-2">
                {heroAvatars.slice(0, 4).map((a, i) => (
                  <img key={i} src={a} alt="" loading="lazy" className="w-5 h-5 sm:w-7 sm:h-7 rounded-full ring-2 ring-white object-cover" />
                ))}
              </div>
              <span className="text-[11px] sm:text-sm font-medium text-foreground whitespace-nowrap">
                Join <span className="text-primary font-bold">{displayStats.students.toLocaleString()}+</span> learners building today
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, type: "spring" }}
              className="flex flex-wrap gap-3 justify-center"
            >
              <MagneticButton size="lg" asChild className="shimmer-btn text-primary-foreground relative overflow-hidden">
                <Link to="/courses">{home?.hero_cta_primary ?? "Explore Courses"} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </MagneticButton>
              {!user && (
                <MagneticButton size="lg" variant="outline" asChild className="border-primary/30 text-foreground hover:bg-primary/5 hover:text-primary">
                  <Link to="/sign-up">{home?.hero_cta_secondary ?? "Sign up free"}</Link>
                </MagneticButton>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xs text-muted-foreground mt-4"
            >
              No credit card required
            </motion.p>
          </div>

          {/* scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-1.5 text-muted-foreground/60"
          >
            <Mouse className="h-4 w-4" />
            <motion.div
              animate={reduce ? {} : { y: [0, 6, 0], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="w-px h-6 bg-current"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ───────────────── ALUMNI MARQUEE ───────────────── */}
      <section className="border-y border-border/40 bg-card/40 backdrop-blur-sm py-7 relative">
        <div className="container mx-auto px-4">
          <p className="text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-5">
            {home?.alumni_label ?? "Our alumni now work at"}
          </p>
          <div className="relative overflow-hidden mask-fade-x">
            <div className="flex animate-marquee gap-12 sm:gap-16 items-center" style={{ width: "max-content" }}>
              {Array.from({ length: 2 }).flatMap((_, dup) => [
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg", alt: "Google" },
                { src: "https://cdn.simpleicons.org/microsoft/0078D4", alt: "Microsoft" },
                { src: "https://cdn.simpleicons.org/amazonwebservices/232F3E", alt: "AWS" },
                { src: "https://cdn.simpleicons.org/microsoftazure/0078D4", alt: "Azure" },
                { src: "https://cdn.simpleicons.org/meta/0467DF", alt: "Meta" },
                { src: "https://cdn.simpleicons.org/ibm/052FAD", alt: "IBM" },
                { src: "https://cdn.simpleicons.org/oracle/F80000", alt: "Oracle" },
                { src: "https://cdn.simpleicons.org/intel/0071C5", alt: "Intel" },
                { src: "https://cdn.simpleicons.org/cisco/1BA0D7", alt: "Cisco" },
                { src: "https://cdn.simpleicons.org/paystack/00C3F7", alt: "Paystack" },
              ].map((logo, i) => (
                <img
                  key={`${logo.alt}-${dup}-${i}`}
                  src={logo.src}
                  alt={logo.alt}
                  className="h-7 sm:h-8 w-auto opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── STATS BAND ───────────────── */}
      <section className="py-12 md:py-16 relative">
        <div className="container mx-auto px-4">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5"
          >
            {[
              { icon: Users, label: "Students worldwide", target: displayStats.students, suffix: "+" },
              { icon: BookOpen, label: "Live courses", target: displayStats.courses, suffix: "" },
              { icon: GraduationCap, label: "Industry mentors", target: displayStats.instructors, suffix: "+" },
              { icon: Globe2, label: "Countries reached", target: displayStats.countries, suffix: "" },
            ].map((s) => (
              <motion.div
                key={s.label}
                variants={staggerItem}
                whileHover={{ y: -4 }}
                className="glass-card rounded-2xl border border-border/60 p-5 md:p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <div className="font-heading text-3xl md:text-4xl font-bold">
                  <CountUp target={s.target} suffix={s.suffix} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────────────── BENTO — WHY ───────────────── */}
      <section className="py-20 md:py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div {...sectionReveal} className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">{home?.why_eyebrow ?? "Why Silicon Edge"}</p>
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-balance">
              {home?.why_title ? (
                <span className="text-gradient">{home.why_title}</span>
              ) : (
                <>Built for the way <span className="text-gradient">ambitious people</span> learn<span className="text-gold">.</span></>
              )}
            </h2>
            {home?.why_description && (
              <p className="text-muted-foreground mt-4 text-base leading-relaxed">{home.why_description}</p>
            )}
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-6 gap-4 md:gap-5 auto-rows-[minmax(180px,auto)]"
          >
            {/* Large — live chat */}
            <motion.div variants={staggerItem} whileHover={{ y: -6 }} className="md:col-span-4 row-span-2 glass-card rounded-3xl border border-border/60 p-7 relative overflow-hidden hover:border-primary/30 transition-all">
              <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center"><MessageCircle className="h-4.5 w-4.5 text-primary" /></div>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Cohort space</span>
              </div>
              <h3 className="font-heading text-xl md:text-2xl font-semibold mb-1">Live, instructor-led classes — not a pre-recorded slog.</h3>
              <p className="text-sm text-muted-foreground">Ask, build, and ship in real time with mentors who reply in minutes.</p>
              <ChatBubbleTile />
            </motion.div>

            {/* Medium — completion */}
            <motion.div variants={staggerItem} whileHover={{ y: -6 }} className="md:col-span-2 glass-card rounded-3xl border border-border/60 p-6 relative overflow-hidden hover:border-primary/30 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Completion</span>
              </div>
              <h3 className="font-heading font-semibold">Built for completion</h3>
              <RadialProgressTile value={92} />
              <p className="text-xs text-muted-foreground text-center mt-1">of cohort students finish their track</p>
            </motion.div>

            {/* Medium — skills */}
            <motion.div variants={staggerItem} whileHover={{ y: -6 }} className="md:col-span-2 glass-card rounded-3xl border border-border/60 p-6 hover:border-primary/30 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Hireable</span>
              </div>
              <h3 className="font-heading font-semibold">Skills that get you hired</h3>
              <SkillChipsTile />
            </motion.div>

            {/* Medium — community */}
            <motion.div variants={staggerItem} whileHover={{ y: -6 }} className="md:col-span-2 glass-card rounded-3xl border border-border/60 p-6 hover:border-primary/30 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Community</span>
              </div>
              <h3 className="font-heading font-semibold">Cohort energy, lifelong network</h3>
              <AvatarStackTile avatars={heroAvatars} />
            </motion.div>

            {/* Small — lifetime */}
            <motion.div variants={staggerItem} whileHover={{ y: -6 }} className="md:col-span-2 glass-card rounded-3xl border border-border/60 p-6 hover:border-primary/30 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <PlayCircle className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Lifetime</span>
              </div>
              <h3 className="font-heading font-semibold">Lifetime access to recordings</h3>
              <p className="text-sm text-muted-foreground mt-2">Replay any class, anytime. Learn the second time even faster.</p>
              <motion.div
                animate={reduce ? {} : { scale: [1, 1.08, 1] }}
                transition={{ duration: 2.4, repeat: Infinity }}
                className="mt-4 inline-flex items-center gap-2 text-xs text-primary font-medium"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Always available
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───────────────── COURSES ───────────────── */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div {...sectionReveal}>
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">{home?.categories_eyebrow ?? "Browse Categories"}</p>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <h2 className="font-heading text-3xl md:text-4xl font-bold mb-2">{home?.categories_title ?? "Courses worth your time"}</h2>
                <p className="text-muted-foreground">{home?.categories_description ?? "New tracks added every month, taught by people who ship."}</p>
              </div>
              <Link to="/courses" className="text-primary font-medium text-sm flex items-center hover:underline hover-scale">View All <ChevronRight className="h-4 w-4 ml-1" /></Link>
            </div>
          </motion.div>

          {/* category pills with layoutId underline */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative px-2 pb-2 text-sm font-semibold transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {isActive && (
                    <motion.span layoutId="cat-underline" className="absolute left-0 right-0 -bottom-px h-[2px] bg-primary rounded-full" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                  )}
                  <span className="relative">{cat}</span>
                </button>
              );
            })}
          </div>

          <div className="relative group/rail">
            <button onClick={() => scrollCourses("left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all -ml-3 opacity-0 group-hover/rail:opacity-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => scrollCourses("right")} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all -mr-3 opacity-0 group-hover/rail:opacity-100">
              <ChevronRight className="h-5 w-5" />
            </button>

            <div ref={scrollRef} className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory mask-fade-x" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {filteredCourses.map((course, i) => (
                <div key={course.id} className="min-w-[300px] max-w-[320px] snap-start flex-shrink-0">
                  <CourseCard course={course} index={i} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── HOW IT WORKS — scroll timeline ───────────────── */}
      <section ref={timelineRef} className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.05),transparent_70%)]" />
        <div className="container mx-auto px-4 relative">
          <motion.div {...sectionReveal} className="text-center mb-16 max-w-2xl mx-auto">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">{home?.how_eyebrow ?? "How it works"}</p>
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-balance">
              {home?.how_title ? (
                <span className="text-gradient">{home.how_title}</span>
              ) : (
                <>From <span className="text-gradient">curious</span> to <span className="text-gradient">hired</span><span className="text-gold">.</span></>
              )}
            </h2>
          </motion.div>

          <div className="relative max-w-3xl mx-auto">
            {/* base line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-1/2" />
            {/* progress line */}
            <motion.div
              style={{ scaleY: lineScale, transformOrigin: "top" }}
              className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-accent to-gold md:-translate-x-1/2"
            />

            {[
              { n: "01", icon: Sparkles, title: home?.how_step1_title ?? "Apply & enroll",        desc: home?.how_step1_desc ?? "Pick your track. Pay flexibly. Get instant access to your cohort." },
              { n: "02", icon: Clock4,   title: home?.how_step2_title ?? "Learn live, weekly",    desc: home?.how_step2_desc ?? "Real instructor-led classes with Q&A. Recordings keep you on track." },
              { n: "03", icon: Rocket,   title: home?.how_step3_title ?? "Build real projects",   desc: home?.how_step3_desc ?? "Ship portfolio-grade work, reviewed by mentors actively working in tech." },
              { n: "04", icon: Trophy,   title: home?.how_step4_title ?? "Get job-ready",         desc: home?.how_step4_desc ?? "CV reviews, mock interviews, and intros to our hiring partner network." },
            ].map((step, i) => {
              const left = i % 2 === 0;
              return (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, x: left ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ type: "spring", stiffness: 60, damping: 18 }}
                  className={`relative grid md:grid-cols-2 gap-6 mb-12 md:mb-16 ${left ? "" : "md:[&>*:first-child]:order-2"}`}
                >
                  {/* node */}
                  <div className="absolute left-6 md:left-1/2 top-6 -translate-x-1/2 w-4 h-4 rounded-full bg-primary ring-4 ring-background z-10" />

                  <div className={`pl-16 md:pl-0 ${left ? "md:text-right md:pr-12" : "md:pl-12"}`}>
                    <span className="font-heading text-5xl md:text-6xl font-bold text-gradient leading-none">{step.n}</span>
                  </div>
                  <div className={`pl-16 md:pl-0 ${left ? "md:pl-12" : "md:text-right md:pr-12"}`}>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3 ${left ? "md:flex-row" : "md:flex-row-reverse"}`}>
                      <step.icon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">Step {step.n}</span>
                    </div>
                    <h3 className="font-heading text-xl md:text-2xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────── INSTRUCTORS RAIL ───────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div {...sectionReveal} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">{home?.instructors_eyebrow ?? "World-class instructors"}</p>
              <h2 className="font-heading text-3xl md:text-5xl font-bold text-balance max-w-2xl">
                {home?.instructors_title ? (
                  <span className="text-gradient">{home.instructors_title}</span>
                ) : (
                  <>Taught by people <span className="text-gradient">actively shipping</span> in tech<span className="text-gold">.</span></>
                )}
              </h2>
            </div>
            <a href={communityUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-medium text-sm flex items-center hover:underline">Meet them all <ChevronRight className="h-4 w-4 ml-1" /></a>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 snap-x mask-fade-x"
            style={{ scrollbarWidth: "none" }}
          >
            {instructors.map((inst) => (
              <motion.div
                key={inst.id}
                variants={staggerItem}
                whileHover={{ y: -8, rotate: 1 }}
                className="group min-w-[260px] max-w-[280px] snap-start flex-shrink-0 rounded-3xl overflow-hidden border border-border/60 bg-card relative"
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img src={inst.image} alt={inst.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                  <h3 className="font-heading font-semibold text-white">{inst.name}</h3>
                  <p className="text-white/70 text-xs">{inst.role}</p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                    <span className="text-xs text-white/90 font-medium">{inst.rating}</span>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────────────── MENTORS BLOCK ───────────────── */}
      <section className="py-20 bg-hero relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <div className="noise-overlay" />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div {...sectionReveal}>
              <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">{home?.mentors_eyebrow ?? "Meet your mentors"}</p>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-hero mb-6 text-balance">
                {home?.mentors_title ?? "Guidance from people who've already done it."}
              </h2>
              <p className="text-hero-muted leading-relaxed mb-8 max-w-lg">
                {home?.mentors_description ?? "Our mentors are senior engineers and managers from the companies you want to work at. They review your code, your CV, and your interview answers — and they tell you the truth."}
              </p>
              <div className="space-y-5">
                {[
                  { icon: Shield, title: "Industry veterans", desc: "Seasoned professionals sharing current insights and best practices." },
                  { icon: Heart, title: "Dedicated support", desc: "Personalized guidance, fast answers, and constructive feedback." },
                  { icon: CheckCircle2, title: "Practical-first", desc: "Hands-on projects and real-world scenarios — no theory dumps." },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 80, delay: i * 0.12 }}
                    viewport={{ once: true }}
                    whileHover={{ x: 6 }}
                    className="flex gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-heading font-semibold text-hero text-sm">{item.title}</h4>
                      <p className="text-hero-muted text-sm mt-0.5">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* layered mentor visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 60, damping: 18 }}
              className="relative aspect-[4/5] max-w-md mx-auto w-full"
            >
              <div className="absolute inset-0 rounded-3xl overflow-hidden glow-purple">
                <img
                  src={(home?.mentor_image && home.mentor_image.trim().length > 0) ? home.mentor_image : (instructors[0]?.image ?? instructor1)}
                  alt="Mentor"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              {/* floating cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                animate={reduce ? {} : { y: [0, -8, 0] }}
                className="absolute -top-3 -right-3 bg-card border border-border rounded-2xl p-3 shadow-2xl flex items-center gap-2.5 max-w-[180px]"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Project graded</p>
                  <p className="text-xs font-semibold">A+ — Cloud Lab 04</p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45 }}
                animate={reduce ? {} : { y: [0, 6, 0] }}
                className="absolute bottom-6 -left-4 bg-card border border-border rounded-2xl p-3 shadow-2xl flex items-center gap-2.5 max-w-[200px]"
              >
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Just now</p>
                  <p className="text-xs font-semibold">Job offer received 🎉</p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="absolute -bottom-2 right-4 bg-card border border-border rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-2"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-medium">Live · 24 online</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───────────────── TRUST + TESTIMONIALS (masonry) ───────────────── */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div {...sectionReveal} className="text-center mb-10 max-w-2xl mx-auto">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">{home?.testimonials_eyebrow ?? "Loved by ambitious learners"}</p>
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-balance">
              {home?.testimonials_title ? (
                <span className="text-gradient">{home.testimonials_title}</span>
              ) : (
                <>Don't take <span className="text-gradient">our word for it</span><span className="text-gold">.</span></>
              )}
            </h2>
          </motion.div>

          {/* trust chips */}
          <motion.div
            {...sectionReveal}
            className="flex flex-wrap justify-center gap-2 mb-12"
          >
            {[
              { icon: BadgeCheck, label: "Verified Certificates" },
              { icon: Shield, label: "7-Day Money-Back" },
              { icon: GraduationCap, label: "Industry Mentors" },
              { icon: PlayCircle, label: "Live + Recorded" },
              { icon: Lock, label: "Secure Payments" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-card/60 backdrop-blur text-xs">
                <b.icon className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{b.label}</span>
              </div>
            ))}
          </motion.div>

          {/* vertical scrolling columns */}
          <VerticalTestimonialMarquee testimonials={testimonials} speed={home?.testimonial_speed} />
        </div>
      </section>

      {/* ───────────────── FINAL CTA ───────────────── */}
      <section className="bg-hero py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-50" />
        <div className="absolute inset-x-0 bottom-0 h-[55%] overflow-hidden">
          <div className="perspective-grid absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-hero via-hero/80 to-transparent" />
        </div>
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-primary/10 blur-3xl"
          animate={reduce ? {} : { opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: "opacity" }}
        />
        <div className="container mx-auto px-4 text-center relative">
          <motion.div {...sectionReveal} className="max-w-2xl mx-auto">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-4">{home?.cta_eyebrow ?? "Your edge starts now"}</p>
            <h2 className="font-heading text-4xl md:text-6xl font-bold text-hero mb-5 text-balance leading-[1.05]">
              {home?.cta_title ? (
                <span className="text-gradient">{home.cta_title}</span>
              ) : (
              <>Stop scrolling. <br className="hidden sm:block" /><span className="text-gradient">Start learning</span><span className="text-gold">.</span></>
              )}
            </h2>
            <p className="text-hero-muted max-w-lg mx-auto mb-8 text-base md:text-lg">
              {home?.cta_subtitle ?? "Join the next cohort and graduate with a portfolio, a network, and the confidence to compete anywhere."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <MagneticButton size="lg" asChild className="shimmer-btn text-primary-foreground relative overflow-hidden">
                <Link to="/courses">{home?.cta_primary ?? "Browse courses"} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </MagneticButton>
              <MagneticButton size="lg" variant="outline" asChild className="border-hero-muted/30 text-hero-muted hover:bg-navy-light hover:text-hero">
                <Link to="/for-businesses">{home?.cta_secondary ?? "Talk to admissions"}</Link>
              </MagneticButton>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
