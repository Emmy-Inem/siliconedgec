import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Users, Award, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CourseCard } from "@/components/CourseCard";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { courses, categories } from "@/data/courses";

const typewriterWords = [
  "Artificial Intelligence",
  "Cloud Architecture",
  "DevOps Engineering",
  "Data Science",
  "Cybersecurity",
];

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

const trustLogos = [
  "AWS", "Google Cloud", "Microsoft Azure", "Docker", "Kubernetes",
  "Terraform", "Python", "TensorFlow", "React", "PostgreSQL",
];

const valueProps = [
  {
    icon: BookOpen,
    title: "Instructor-Led",
    description: "Learn live from industry veterans who bring real-world experience to every session.",
  },
  {
    icon: Users,
    title: "Job Ready",
    description: "Our curriculum is designed around what employers actually need. Graduate with a portfolio, not just theory.",
  },
  {
    icon: Award,
    title: "Completion Focused",
    description: "Structured cohorts, accountability partners, and mentorship to ensure you finish what you start.",
  },
];

export default function Index() {
  const typedText = useTypewriter(typewriterWords);
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredCourses =
    activeCategory === "All"
      ? courses
      : courses.filter((c) => c.category === activeCategory);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="bg-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--teal-glow)/0.08),transparent_60%)]" />
        <div className="container mx-auto px-4 pt-32 pb-20 md:pt-40 md:pb-28 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-4">
              Live Online Training
            </p>
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-hero leading-tight mb-4">
              Master{" "}
              <span className="text-gradient">
                {typedText}
                <span className="border-r-2 border-primary animate-typewriter-blink ml-0.5" />
              </span>
              <br />
              <span className="text-hero-muted">with Industry Veterans</span>
            </h1>
            <p className="text-hero-muted text-lg md:text-xl max-w-xl mb-8 leading-relaxed">
              Job-ready skills through practical, instructor-led programs.
              Join a cohort. Build real projects. Land your next role.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link to="/courses">
                  Explore Courses <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-hero-muted/30 text-hero-muted hover:bg-navy-light hover:text-hero" asChild>
                <Link to="/for-businesses">For Businesses</Link>
              </Button>
            </div>

            <div className="flex items-center gap-6 mt-10 text-hero-muted text-sm">
              <span className="flex items-center gap-2"><span className="text-primary font-bold text-lg">6,000+</span> Students</span>
              <span className="flex items-center gap-2"><span className="text-primary font-bold text-lg">95%</span> Completion</span>
              <span className="flex items-center gap-2"><span className="text-primary font-bold text-lg">4.8</span> Avg Rating</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y border-border bg-muted/50 py-6 overflow-hidden">
        <div className="container mx-auto px-4 mb-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground text-center">Tools & Technologies You'll Master</p>
        </div>
        <div className="relative">
          <div className="flex animate-marquee gap-12 whitespace-nowrap">
            {[...trustLogos, ...trustLogos].map((logo, i) => (
              <span key={i} className="text-muted-foreground/60 font-heading font-semibold text-lg">{logo}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Why <span className="text-gradient">Silicon Edge</span>?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              We don't just teach — we build careers. Our approach combines live instruction, practical projects, and career support.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {valueProps.map((prop, i) => (
              <motion.div
                key={prop.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl border border-border p-8 text-center hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <prop.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-3">{prop.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{prop.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Grid with Category Filter */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mb-2">Popular Programs</h2>
              <p className="text-muted-foreground">Hands-on training designed for the modern tech professional.</p>
            </div>
            <Link to="/courses" className="text-primary font-medium text-sm flex items-center hover:underline">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-14">
            What Our <span className="text-gradient">Students Say</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Adaeze Chukwu", role: "Cloud Engineer at Flutterwave", quote: "Silicon Edge gave me the practical skills that got me hired. The instructors genuinely care about your success.", rating: 5 },
              { name: "Tunde Bakare", role: "Data Analyst at Paystack", quote: "The cohort-based approach kept me accountable. I completed the program in 8 weeks and landed a role within a month.", rating: 5 },
              { name: "Halima Yusuf", role: "DevOps Lead at Andela", quote: "The hands-on labs and real-world projects set this apart from every online course I've tried. Worth every naira.", rating: 5 },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl border border-border p-6 space-y-4"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <span key={j} className="text-accent">★</span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
                <div>
                  <p className="font-heading font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-hero py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-hero mb-4">
            Ready to Level Up Your Career?
          </h2>
          <p className="text-hero-muted max-w-lg mx-auto mb-8">
            Join thousands of professionals who have transformed their careers with Silicon Edge.
          </p>
          <Button size="lg" asChild>
            <Link to="/courses">
              Browse Programs <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
