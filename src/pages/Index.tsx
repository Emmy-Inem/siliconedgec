import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, useReducedMotion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, BadgeCheck, BriefcaseBusiness, ChevronRight, ChevronLeft, Star, ShieldCheck, GraduationCap, CheckCircle2, Zap, Clock4, Rocket, Trophy, Lock, PlayCircle, Users, Globe2, MessagesSquare, Quote, Target, Handshake, PartyPopper } from "lucide-react";
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
import { getWhatsAppCommunityUrl } from "@/lib/whatsapp";
import instructor1 from "@/assets/stock/instructor-1.jpg";
import instructor2 from "@/assets/stock/instructor-2.jpg";
import instructor3 from "@/assets/stock/instructor-3.jpg";
import instructor4 from "@/assets/stock/instructor-4.jpg";
import mentorStock from "@/assets/stock/mentor.jpg";
import testimonial1 from "@/assets/stock/testimonial-1.jpg";
import testimonial2 from "@/assets/stock/testimonial-2.jpg";
import testimonial3 from "@/assets/stock/testimonial-3.jpg";
import testimonial4 from "@/assets/stock/testimonial-4.jpg";
import testimonial5 from "@/assets/stock/testimonial-5.jpg";
import testimonial6 from "@/assets/stock/testimonial-6.jpg";
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
      <div className="absolute inset-[12%] rounded-full bg-primary/10 blur-3xl" />

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

/** Two slow orbital marquee rows of tech logos (top drifts right, bottom drifts left).
 * Frames the hero headline without crowding it; logos are always in motion. */
function FloatingTechLogos() {
  // Scattered, gently floating logo cards positioned around the hero headline.
  // Each card has fixed coordinates so the layout feels intentional and premium,
  // not random. Smaller / decorative cards are hidden on mobile to keep it clean.
  type Pos = {
    top: string;
    left: string;
    size: number;        // px
    rot: number;         // initial rotation
    delay: number;       // float anim delay
    mobile?: boolean;    // show on mobile too
  };

  const positions: Pos[] = [
    { top: "10%", left: "6%",  size: 56, rot: -8,  delay: 0,    mobile: true },
    { top: "22%", left: "86%", size: 60, rot:  6,  delay: 0.4,  mobile: true },
    { top: "60%", left: "4%",  size: 52, rot:  4,  delay: 0.8,  mobile: true },
    { top: "70%", left: "88%", size: 56, rot: -6,  delay: 1.2,  mobile: true },
    { top: "4%",  left: "44%", size: 48, rot:  3,  delay: 0.2 },
    { top: "32%", left: "16%", size: 50, rot: -4,  delay: 0.6 },
    { top: "30%", left: "78%", size: 50, rot:  5,  delay: 1.0 },
    { top: "78%", left: "20%", size: 54, rot:  7,  delay: 0.3 },
    { top: "82%", left: "70%", size: 50, rot: -5,  delay: 0.9 },
    { top: "50%", left: "92%", size: 44, rot:  4,  delay: 1.4 },
    { top: "55%", left: "2%",  size: 44, rot: -7,  delay: 1.6 },
    { top: "16%", left: "70%", size: 48, rot: -3,  delay: 0.5 },
  ];

  const items = HERO_TECH_LOGOS.slice(0, positions.length).map((logo, i) => ({
    logo,
    pos: positions[i],
  }));

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {items.map(({ logo, pos }, i) => (
        <motion.div
          key={logo.name}
          initial={{ opacity: 0, scale: 0.6, rotate: pos.rot }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -10, 0],
            rotate: [pos.rot, pos.rot + 3, pos.rot],
          }}
          transition={{
            opacity: { duration: 0.6, delay: 0.2 + i * 0.04 },
            scale: { duration: 0.6, delay: 0.2 + i * 0.04, ease: "easeOut" },
            y: { duration: 6 + (i % 4), repeat: Infinity, ease: "easeInOut", delay: pos.delay },
            rotate: { duration: 6 + (i % 4), repeat: Infinity, ease: "easeInOut", delay: pos.delay },
          }}
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.size,
            height: pos.size,
            willChange: "transform",
          }}
          className="absolute rounded-2xl bg-white border border-primary/10 shadow-[0_10px_30px_-14px_hsl(var(--primary)/0.4)] p-2.5 hidden md:flex items-center justify-center"
          title={logo.name}
        >
          <img
            src={logo.src}
            alt={logo.name}
            loading="lazy"
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/* ----------------------------- bento tiles ----------------------------- */

function ChatBubbleTile() {
  const messages = [
    { text: "Today: deploy a fault-tolerant VPC across 3 AZs on AWS.", side: "left" as const },
    { text: "Should the NAT gateway be per-AZ or shared?", side: "right" as const },
    { text: "Per-AZ. Shared NAT adds a single point of failure and cross-AZ data costs.", side: "left" as const },
    { text: "Got it. Pushing my Terraform module now.", side: "right" as const },
    { text: "Nice. I’ll review the IAM least-privilege policies live in five minutes.", side: "left" as const },
  ];
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % messages.length), 3200);
    return () => clearInterval(t);
  }, []);

  const active = messages[i];

  return (
    <div className="mt-5 min-h-[180px] rounded-[1.75rem] border border-border/50 bg-background/80 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-80" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Live mentor feedback</span>
        </div>
        <div className="flex gap-1.5">
          {messages.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-500 ${idx === i ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${active.text}-${i}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`max-w-[88%] px-4 py-3 text-sm leading-relaxed shadow-sm ${
            active.side === "left"
              ? "rounded-3xl rounded-bl-md bg-muted text-foreground"
              : "ml-auto rounded-3xl rounded-br-md bg-primary text-primary-foreground"
          }`}
        >
          {active.text}
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:max-w-[18rem]">
        <div className="rounded-2xl border border-border/50 bg-card px-3 py-2">Terraform review</div>
        <div className="rounded-2xl border border-border/50 bg-card px-3 py-2">Career feedback</div>
      </div>
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

/* ----------------------------- alumni marquee ----------------------------- */

// Use Simple Icons with explicit slug + black hex so every logo renders as a
// uniform solid-black mark on a white/grayscale background (no missing assets,
// no inconsistent sizes, no white-on-white blanks).
const ALUMNI_BRANDS: { name: string; slug: string }[] = [
  { name: "Google",     slug: "google" },
  { name: "Meta",       slug: "meta" },
  { name: "Apple",      slug: "apple" },
  { name: "Cisco",      slug: "cisco" },
  { name: "Intel",      slug: "intel" },
  { name: "Nvidia",     slug: "nvidia" },
  { name: "GitHub",     slug: "github" },
  { name: "Atlassian",  slug: "atlassian" },
  { name: "Stripe",     slug: "stripe" },
  { name: "Shopify",    slug: "shopify" },
  { name: "Netflix",    slug: "netflix" },
  { name: "Spotify",    slug: "spotify" },
  { name: "Airbnb",     slug: "airbnb" },
  { name: "Uber",       slug: "uber" },
  { name: "PayPal",     slug: "paypal" },
  { name: "Tesla",      slug: "tesla" },
  { name: "Cloudflare", slug: "cloudflare" },
  { name: "Vercel",     slug: "vercel" },
  { name: "Docker",     slug: "docker" },
  { name: "MongoDB",    slug: "mongodb" },
];

function AlumniMarquee() {
  return (
    <div className="relative overflow-hidden" aria-label="Our alumni work at leading global companies">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />

      <div
        className="flex w-max items-center py-5 will-change-transform"
        style={{ animation: "marquee 42s linear infinite" }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-10 sm:gap-14 pr-10 sm:pr-14">
            {ALUMNI_BRANDS.map((brand) => (
              <a
                key={`${brand.name}-${copy}`}
                href="#"
                onClick={(e) => e.preventDefault()}
                title={brand.name}
                aria-label={brand.name}
                className="group relative flex h-8 sm:h-9 w-[110px] sm:w-[130px] shrink-0 items-center justify-center"
              >
                {/* Black/grayscale base */}
                <img
                  src={`https://cdn.simpleicons.org/${brand.slug}/111111`}
                  alt={brand.name}
                  loading="lazy"
                  width={120}
                  height={36}
                  className="max-h-full max-w-full object-contain opacity-60 transition-opacity duration-300 ease-out group-hover:opacity-0"
                />
                {/* Full color overlay revealed on hover */}
                <img
                  src={`https://cdn.simpleicons.org/${brand.slug}`}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  width={120}
                  height={36}
                  className="absolute inset-0 m-auto max-h-full max-w-full object-contain opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
                />
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

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
  { id: "fb1", name: "Chiamaka Okonkwo", role: "Cloud Administrator at Flutterwave", quote: "Finally, a course I actually finished. The live tutors kept me accountable and the projects landed me a remote Cloud role within months. Genuinely a game-changer.", avatar_url: testimonial1 as string | null, rating: 5 },
  { id: "fb2", name: "Daniel Adeyemi", role: "Junior Software Engineer at Andela", quote: "The support is on another level. Tutors replied within minutes, and the lifetime access to recordings meant I never fell behind. Highly recommend.", avatar_url: testimonial2 as string | null, rating: 5 },
  { id: "fb3", name: "Aisha Bello", role: "DevOps Engineer at Paystack", quote: "I switched careers in seven months. The mock interviews were brutal in the best possible way and prepared me for every question I got asked.", avatar_url: testimonial3 as string | null, rating: 5 },
  { id: "fb4", name: "Tunde Ogunbiyi", role: "Data Analyst at MTN Nigeria", quote: "Cohort energy is unreal. I built a portfolio I'm genuinely proud to show recruiters and made friends I still ship code with today.", avatar_url: testimonial4 as string | null, rating: 5 },
  { id: "fb5", name: "Priya Ramachandran", role: "Software Engineer at Microsoft", quote: "Mentors actually working at Google, AWS and Microsoft. The bar is high — exactly what I needed to make the leap to a senior role.", avatar_url: testimonial5 as string | null, rating: 5 },
  { id: "fb6", name: "Kwame Asante", role: "ML Engineer at Spotify", quote: "Real projects, real code reviews, no fluff. The career support after the course is honestly what closed the deal for me. Best investment I've made.", avatar_url: testimonial6 as string | null, rating: 5 },
];

const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "tween" as const, ease: "easeOut" as const, duration: 0.5 } },
};
const sectionReveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

/* ----------------------------- main ----------------------------- */

export default function Index() {
  const { data: home } = useHomeContent();
  const { user, isAdmin } = useAuth();
  const reduce = useReducedMotion();
  const { data: settings } = useSiteSettings();
  const communityUrl = getWhatsAppCommunityUrl(settings);

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
        supabase.rpc("get_profiles_count"),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("instructors").select("id", { count: "exact", head: true }),
      ]);
      return {
        students: (students.data as number | null) ?? 0,
        courses: courses.count ?? 0,
        instructors: instructors.count ?? 0,
        countries: 0,
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
    students: parseOverride(home?.stat_students) ?? stats?.students ?? 0,
    courses: parseOverride(home?.stat_courses) ?? stats?.courses ?? 0,
    instructors: parseOverride(home?.stat_instructors) ?? stats?.instructors ?? 0,
    countries: parseOverride(home?.stat_countries) ?? stats?.countries ?? 0,
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
        name: ["Emeka Obi", "Ngozi Adekunle", "Tobi Balogun", "Amara Eze"][idx],
        role: ["Senior Software Engineer", "Cloud Architect", "DevOps Lead", "AI/ML Specialist"][idx],
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

  const stockAvatars = [testimonial1, testimonial2, testimonial3, testimonial4, testimonial5, testimonial6];
  const testimonials = (dbTestimonials && dbTestimonials.length > 0)
    ? dbTestimonials.map((t, i) => ({
        id: t.id,
        name: t.name,
        role: t.role ?? "Student",
        quote: t.quote,
        // Always have a display picture — fall back to a stock headshot if none set.
        avatar_url: t.avatar_url && t.avatar_url.trim().length > 0
          ? t.avatar_url
          : (stockAvatars[i % stockAvatars.length] as string),
        rating: t.rating ?? 5,
      }))
    : fallbackTestimonials;

  const typewriterWords = home?.typewriter_words ?? [
    "Cloud Engineering", "Software Engineering", "Artificial Intelligence",
    "Web Development", "Cybersecurity", "Data Science", "DevOps",
    "Product Design", "UI/UX Design",
  ];
  const typedText = useTypewriter(typewriterWords);

  const [activeCategory, setActiveCategory] = useState("All Categories");
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { data: courses = [] } = useCourses();

  /* page scroll progress */
  const { scrollYProgress: pageProgress } = useScroll();
  const progressX = useTransform(pageProgress, [0, 1], ["0%", "100%"]);

  /* hero parallax — subtle enough to avoid jitter */
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 22]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.92]);

  /* timeline scroll */
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: timelineProgress } = useScroll({ target: timelineRef, offset: ["start 80%", "end 20%"] });
  const lineScale = useSpring(timelineProgress, { stiffness: 80, damping: 20 });

  const categories = ["All Categories", ...Array.from(new Set(courses.map((c) => c.category))).sort()];
  const filteredCourses = activeCategory === "All Categories" ? courses : courses.filter((c) => c.category === activeCategory);

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
        title="Silicon Edge — Job-Ready AI, Cloud & DevOps Training"
        description="Live, instructor-led training in AI, Cloud, DevOps, Cybersecurity & Web. Earn verified certificates and build real projects with industry veterans."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          name: "Silicon Edge Consulting",
          url: "https://siliconedgec.com",
          sameAs: ["https://siliconedgec.com"],
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
          className="container mx-auto px-5 sm:px-6 pt-28 pb-16 sm:pt-32 sm:pb-20 md:pt-40 md:pb-32 relative"
        >
          <div className="max-w-3xl mx-auto text-center relative z-10">
            {/* eyebrow pill */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6"
            >
              <Star className="h-3 w-3" /> {home?.hero_eyebrow ?? "Live, instructor-led tech training"}
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
              className="font-heading font-bold text-foreground leading-[1.04] tracking-tight mb-5 text-balance"
              style={{ fontSize: "clamp(2rem, 7vw, 4.75rem)" }}
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
                {home?.hero_title_post ?? "Unlock your tech career"}<span className="text-gold">.</span>
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
                  <img
                    key={i}
                    src={a || fallbackInstructorImages[i % fallbackInstructorImages.length]}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      const fb = fallbackInstructorImages[i % fallbackInstructorImages.length];
                      if (img.src !== fb) img.src = fb;
                    }}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full ring-2 ring-white object-cover bg-muted"
                  />
                ))}
              </div>
              <span className="text-[11px] sm:text-sm font-medium text-foreground whitespace-nowrap">
                {displayStats.students > 0
                  ? <>Join <span className="text-primary font-bold">{displayStats.students.toLocaleString()}+</span> learners building today</>
                  : <>Join our growing community of learners building today</>}
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

          </div>

        </motion.div>
      </section>

      {/* ───────────────── ALUMNI MARQUEE ───────────────── */}
      <section className="border-y border-border/40 bg-card/40 backdrop-blur-sm py-7 relative">
        <div className="container mx-auto px-5 sm:px-6">
          <p className="text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-5">
            {home?.alumni_label ?? "Our alumni now work at"}
          </p>
          <AlumniMarquee />
        </div>
      </section>

      {/* ───────────────── STATS BAND ───────────────── */}
      <section className="py-12 md:py-16 relative">
        <div className="container mx-auto px-5 sm:px-6">
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
            ].filter((s) => s.target > 0).map((s) => (
              <motion.div
                key={s.label}
                variants={staggerItem}
                whileHover={{ y: -4 }}
                className="glass-card rounded-2xl border border-border/60 p-5 md:p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-primary/12 ring-1 ring-primary/15 flex items-center justify-center shadow-[0_10px_24px_-18px_hsl(var(--primary)/0.75)]">
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
        <div className="container mx-auto px-5 sm:px-6">
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
            <motion.div variants={staggerItem} whileHover={{ y: -2, transition: { duration: 0.22, ease: "easeOut" } }} className="md:col-span-4 row-span-2">
              <Link
                to="/cohorts"
                aria-label="Open cohort space"
                className="group block h-full glass-card rounded-3xl border border-border/60 p-7 relative overflow-hidden hover:border-primary/30 transition-all"
              >
                <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/12 ring-1 ring-primary/15 flex items-center justify-center shadow-[0_10px_24px_-18px_hsl(var(--primary)/0.75)]"><MessagesSquare className="h-5 w-5 text-primary" /></div>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Cohort space</span>
                </div>
                <h3 className="font-heading text-xl md:text-2xl font-semibold mb-1">Live, instructor-led classes — not a pre-recorded slog.</h3>
                <p className="text-sm text-muted-foreground">Ask, build, and ship in real time with mentors who reply in minutes.</p>
                <ChatBubbleTile />
              </Link>
            </motion.div>

            {/* Medium — completion */}
            <motion.div variants={staggerItem} whileHover={{ y: -2, transition: { duration: 0.22, ease: "easeOut" } }} className="md:col-span-2 glass-card rounded-3xl border border-border/60 p-6 relative overflow-hidden hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <BadgeCheck className="h-4.5 w-4.5 text-primary" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Completion</span>
              </div>
              <h3 className="font-heading font-semibold">Built for completion</h3>
              <RadialProgressTile value={92} />
              <p className="text-xs text-muted-foreground text-center mt-1">of cohort students finish their track</p>
            </motion.div>

            {/* Medium — skills */}
            <motion.div variants={staggerItem} whileHover={{ y: -2, transition: { duration: 0.22, ease: "easeOut" } }} className="md:col-span-2 glass-card rounded-3xl border border-border/60 p-6 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4.5 w-4.5 text-primary" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Hireable</span>
              </div>
              <h3 className="font-heading font-semibold">Skills that get you hired</h3>
              <SkillChipsTile />
            </motion.div>

            {/* Medium — community */}
            <motion.div variants={staggerItem} whileHover={{ y: -2, transition: { duration: 0.22, ease: "easeOut" } }} className="md:col-span-2 glass-card rounded-3xl border border-border/60 p-6 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <Handshake className="h-4.5 w-4.5 text-primary" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Community</span>
              </div>
              <h3 className="font-heading font-semibold">Cohort energy, lifelong network</h3>
              <AvatarStackTile avatars={heroAvatars} />
            </motion.div>

            {/* Small — lifetime */}
            <motion.div variants={staggerItem} whileHover={{ y: -2, transition: { duration: 0.22, ease: "easeOut" } }} className="md:col-span-2">
              <Link
                to={user ? "/dashboard" : "/courses"}
                className="group block h-full glass-card rounded-3xl border border-border/60 p-6 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Lifetime</span>
                </div>
                <h3 className="font-heading font-semibold group-hover:text-primary transition-colors">Lifetime access to recordings</h3>
                <p className="text-sm text-muted-foreground mt-2">Replay any class, anytime. Learn the second time even faster.</p>
                <span className="mt-4 inline-flex items-center gap-2 text-xs text-primary font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  {user ? "Open my recordings" : "Browse courses"}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───────────────── COURSES ───────────────── */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-5 sm:px-6">
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
                    <motion.span layoutId="cat-underline" className="absolute left-0 right-0 -bottom-px h-[2px] bg-primary rounded-full" transition={{ duration: 0.22, ease: "easeOut" }} />
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
        <div className="container mx-auto px-5 sm:px-6 relative">
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
              { n: "01", icon: Star, title: home?.how_step1_title ?? "Apply & enroll",        desc: home?.how_step1_desc ?? "Pick your track. Pay flexibly. Get instant access to your cohort." },
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
                  transition={{ duration: 0.42, ease: "easeOut" }}
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
        <div className="container mx-auto px-5 sm:px-6">
          <motion.div {...sectionReveal} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-foreground font-semibold text-sm tracking-widest uppercase mb-3">{home?.instructors_eyebrow ?? "World-class instructors"}</p>
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
            className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x"
            style={{ scrollbarWidth: "none" }}
          >
            {instructors.map((inst) => (
              <motion.div
                key={inst.id}
                variants={staggerItem}
                whileHover={{ y: -8, transition: { duration: 0.3, ease: "easeOut" } }}
                className="group min-w-[260px] max-w-[280px] snap-start flex-shrink-0 rounded-2xl overflow-hidden border border-border/60 bg-card relative shadow-sm hover:shadow-xl transition-shadow duration-300"
              >
                <Link to={`/instructors/${inst.id}`} className="block" aria-label={`View ${inst.name}'s profile`}>
                  <div className="aspect-[4/5] overflow-hidden">
                    <img
                      src={inst.image}
                      alt={inst.name}
                      loading="lazy"
                      className="w-full h-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                    <h3 className="font-heading font-semibold text-white text-lg leading-tight">{inst.name}</h3>
                    <p className="text-white/75 text-sm mt-0.5">{inst.role}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="h-4 w-4 fill-gold text-gold" />
                      <span className="text-xs text-white/90 font-medium">{inst.rating}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────────────── MENTORS BLOCK ───────────────── */}
      <section className="py-20 bg-hero relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <div className="noise-overlay" />
        <div className="container mx-auto px-5 sm:px-6 relative">
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
                  { icon: ShieldCheck, title: "Industry veterans", desc: "Seasoned professionals sharing current insights and best practices." },
                  { icon: Handshake, title: "Dedicated support", desc: "Personalized guidance, fast answers, and constructive feedback." },
                  { icon: CheckCircle2, title: "Practical-first", desc: "Hands-on projects and real-world scenarios — no theory dumps." },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.08 }}
                    viewport={{ once: true }}
                    whileHover={{ x: 3 }}
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
              transition={{ duration: 0.6, ease: "easeOut" }}
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
                  <BriefcaseBusiness className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Just now</p>
                  <p className="text-xs font-semibold flex items-center gap-1">
                    Job offer received <PartyPopper className="h-3 w-3 text-primary" />
                  </p>
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
        <div className="container mx-auto px-5 sm:px-6">
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
              { icon: ShieldCheck, label: "7-Day Money-Back" },
              { icon: GraduationCap, label: "Industry Mentors" },
              { icon: PlayCircle, label: "Live + Recorded" },
              { icon: Lock, label: "Secure Payments" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-card/60 backdrop-blur text-xs">
                <b.icon className="h-4 w-4 text-primary" />
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
        <div className="container mx-auto px-5 sm:px-6 text-center relative">
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
