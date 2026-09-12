import { motion } from "framer-motion";
import {
  Quote, Star, BadgeCheck, ShieldCheck, GraduationCap, PlayCircle, Lock,
  Play, ArrowUpRight
} from "lucide-react";
import videoTestimonialDoreez from "@/assets/testimonials/video-testimonial-doreez.jpg";
import videoTestimonialSimeon from "@/assets/testimonials/video-testimonial-simeon.jpg";
import videoTestimonialMichael from "@/assets/testimonials/video-testimonial-michael.jpg";
import { sectionReveal } from "./HomeMotionHelpers";

export type TestimonialItem = {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar_url: string | null;
  rating: number;
};

interface VideoTestimonial {
  id: string;
  name: string;
  role: string;
  title: string;
  quote: string;
  thumbnail: string;
  videoUrl: string;
  tag: string;
}

const videoTestimonials: VideoTestimonial[] = [
  {
    id: "video-doreez",
    name: "Doreez",
    role: "@techtokwithdee · Cloud Engineering Learner",
    title: "From Confused to Hired: My Cloud Roadmap",
    quote: "Sometime ago, I was stuck watching tutorials with zero direction. What I needed was a clear roadmap. That's how I found Cloud Engineering—a high income skill that made everything click.",
    thumbnail: videoTestimonialDoreez,
    videoUrl: "https://www.instagram.com/reel/DX1DD1qM9fd/?stkn=MXQ4djBiMnBlaG1xNQ==",
    tag: "Student Story",
  },
  {
    id: "video-simeon",
    name: "Simeon Onu",
    role: "Cloud Engineering Alum",
    title: "Transformational Bootcamp for Cloud Engineering",
    quote: "This bootcamp is highly transformational. It has given me a solid foundation for my cloud engineering career.",
    thumbnail: videoTestimonialSimeon,
    videoUrl: "https://www.instagram.com/reel/Dauih0ds_Zw/?stkn=MTU5ejFod2Q3ajFnNw==",
    tag: "Bootcamp Review",
  },
  {
    id: "video-michael",
    name: "Michael Olagoke",
    role: "Cloud Engineering Bootcamp Graduate",
    title: "From Zero to Cloud Confidence in 4 Weeks",
    quote: "Joined with zero knowledge and gained hands-on practical experience with Microsoft Azure, from tenant subscriptions and resource groups to real-world cloud fundamentals.",
    thumbnail: videoTestimonialMichael,
    videoUrl: "https://www.instagram.com/reel/Db-luPzsA-g/?stkn=MTNuZ3dmeW80cWdmNg==",
    tag: "Alumni Journey",
  },
];

function TestimonialCard({ t }: { t: TestimonialItem }) {
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

function VerticalTestimonialMarquee({ testimonials, speed = "normal" }: { testimonials: TestimonialItem[]; speed?: string }) {
  const pool: TestimonialItem[] = [...testimonials];
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

function VideoTestimonialCard({ item }: { item: VideoTestimonial }) {
  return (
    <a
      href={item.videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col h-full rounded-2xl overflow-hidden glass-card border border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
      aria-label={`Watch ${item.name}'s video testimonial on Instagram`}
    >
      <div className="relative aspect-[16/11] sm:aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={item.thumbnail}
          alt={item.name}
          loading="lazy"
          className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/25 to-black/30" />

        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-background/85 backdrop-blur-md border border-border/60 text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {item.tag}
          </span>
        </div>

        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-pink-500/90 via-purple-600/90 to-indigo-600/90 text-white backdrop-blur-md shadow-sm">
            <Play className="h-3 w-3 fill-current" />
            Reel
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/90 text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:shadow-primary/40 group-hover:shadow-xl">
            <Play className="h-6 w-6 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <h3 className="font-heading font-bold text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                {item.name}
              </h3>
              <p className="text-xs text-primary font-medium">{item.role}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
          </div>

          <h4 className="font-heading text-sm font-semibold text-foreground/90 mt-2 line-clamp-2">
            "{item.title}"
          </h4>

          <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">
            {item.quote}
          </p>
        </div>
      </div>
    </a>
  );
}

interface HomeTestimonialsSectionProps {
  testimonials: TestimonialItem[];
  homeContent?: {
    testimonials_eyebrow?: string;
    testimonials_title?: string;
    testimonial_speed?: string;
  } | null;
}

export function HomeTestimonialsSection({ testimonials, homeContent }: HomeTestimonialsSectionProps) {
  return (
    <section className="py-20 md:py-24">
      <div className="container mx-auto px-5 sm:px-6">
        <motion.div {...sectionReveal} className="text-center mb-10 max-w-2xl mx-auto">
          <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">
            {homeContent?.testimonials_eyebrow ?? "Loved by ambitious learners"}
          </p>
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-balance">
            {homeContent?.testimonials_title ? (
              <span className="text-gradient">{homeContent.testimonials_title}</span>
            ) : (
              <>
                What our <span className="text-gradient">students say</span>
                <span className="text-gold">.</span>
              </>
            )}
          </h2>
        </motion.div>

        {/* trust chips */}
        <motion.div {...sectionReveal} className="flex flex-wrap justify-center gap-2">
          {[
            { icon: BadgeCheck, label: "Verified Certificates" },
            { icon: ShieldCheck, label: "7-Day Money-Back" },
            { icon: GraduationCap, label: "Industry Mentors" },
            { icon: PlayCircle, label: "Live + Recorded" },
            { icon: Lock, label: "Secure Payments" },
          ].map((b) => (
            <div
              key={b.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-card/60 backdrop-blur text-xs"
            >
              <b.icon className="h-4 w-4 text-primary" />
              <span className="font-medium">{b.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Video Testimonials */}
        <motion.div {...sectionReveal} className="mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">Video Stories</span>
              <h3 className="font-heading text-xl md:text-2xl font-bold mt-1">Real Journeys. Real Results.</h3>
            </div>
            <p className="text-xs text-muted-foreground">Click any video to watch their full story on Instagram</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videoTestimonials.map((item) => (
              <VideoTestimonialCard key={item.id} item={item} />
            ))}
          </div>
        </motion.div>

        {/* vertical scrolling columns */}
        {testimonials.length > 0 && (
          <div className="mt-14 pt-10 border-t border-border/40">
            <div className="text-center mb-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                More Student Reviews
              </span>
            </div>
            <VerticalTestimonialMarquee testimonials={testimonials} speed={homeContent?.testimonial_speed} />
          </div>
        )}
      </div>
    </section>
  );
}
