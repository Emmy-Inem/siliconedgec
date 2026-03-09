import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Users, Award, Briefcase, ChevronRight, ChevronLeft, Star, Shield, GraduationCap, CheckCircle2, Zap, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CourseCard } from "@/components/CourseCard";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { useCourses } from "@/hooks/useCourses";
import logoLight from "@/assets/logo-light.png";
import instructor1 from "@/assets/instructor-1.jpg";
import instructor2 from "@/assets/instructor-2.jpg";
import instructor3 from "@/assets/instructor-3.jpg";
import instructor4 from "@/assets/instructor-4.jpg";
import courseBanner from "@/assets/course-banner.png";

const typewriterWords = [
  "Cloud Engineering",
  "Software Engineering",
  "Artificial Intelligence",
  "Web Development",
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

const instructors = [
  { name: "Mary Roberts", role: "Professional Web Developer", rating: 4.5, students: 9692, courses: 3, image: instructor1 },
  { name: "DevOps Mentor", role: "Developer of Bootcamp", rating: 4.5, students: 5128, courses: 5, image: instructor2 },
  { name: "Ross Johnson", role: "Engineering Architect", rating: 4.5, students: 7423, courses: 8, image: instructor3 },
  { name: "James Davies", role: "Cloud Engineer", rating: 4.5, students: 3896, courses: 5, image: instructor4 },
];

const testimonials = [
  { name: "Linda Shenoy", role: "Developer and Bootcamp Instructor", quote: "I started at stage zero. With Silicon Edge I was able to start learning online and eventually build up enough knowledge and skills to transition into a well-paying career." },
  { name: "Jean Watson", role: "Engineering Architect", quote: "I started at stage zero. With Silicon Edge I was able to start learning online and eventually build up enough knowledge and skills to transition into a well-paying career." },
  { name: "John Deo", role: "Web Developer, UK", quote: "I started at stage zero. With Silicon Edge I was able to start learning online and eventually build up enough knowledge and skills to transition into a well-paying career." },
  { name: "Rubik Nanda", role: "Web Developer, UK", quote: "I started at stage zero. With Silicon Edge I was able to start learning online and eventually build up enough knowledge and skills to transition into a well-paying career." },
  { name: "Barry Watson", role: "Web Developer, UK", quote: "I started at stage zero. With Silicon Edge I was able to start learning online and eventually build up enough knowledge and skills to transition into a well-paying career." },
];



const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export default function Index() {
  const typedText = useTypewriter(typewriterWords);
  const [activeCategory, setActiveCategory] = useState("All");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: courses = [] } = useCourses();

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
      <Header />

      {/* Hero */}
      <section className="bg-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(262_90%_68%/0.1),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(262_83%_58%/0.06),transparent_50%)]" />
        <div className="container mx-auto px-4 pt-32 pb-20 md:pt-40 md:pb-28 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            {/* Cloud provider logos */}
            <div className="flex items-center justify-center gap-4 mb-8">
              {[
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg", alt: "Google Cloud" },
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg", alt: "Azure" },
                { src: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg", alt: "AWS" },
              ].map((logo) => (
                <motion.div
                  key={logo.alt}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-card shadow-sm flex items-center justify-center p-2"
                >
                  <img src={logo.src} alt={logo.alt} className="w-full h-full object-contain" />
                </motion.div>
              ))}
            </div>

            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-4">
              Start Learning
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl font-bold text-hero leading-tight mb-2">
              <span className="text-gradient">
                {typedText}
                <span className="border-r-2 border-primary animate-typewriter-blink ml-0.5" />
              </span>
            </h1>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold text-hero mb-4">
              Unlock your tech career<span className="text-gold">.</span>
            </h2>
            <p className="text-hero-muted text-base sm:text-lg md:text-xl max-w-xl mx-auto mb-8 leading-relaxed">
              Live Online Courses. Hands-On Projects. Real Certifications.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild className="hover-scale animate-pulse-glow">
                <Link to="/courses">
                  Explore Courses <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-hero-muted/30 text-hero-muted hover:bg-navy-light hover:text-hero hover-scale" asChild>
                <Link to="/sign-up">Sign up now</Link>
              </Button>
            </div>

            {/* Tech logos below CTA */}
            <div className="flex items-center justify-center gap-4 mt-10">
              {[
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg", alt: "Python" },
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg", alt: "Angular" },
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg", alt: "JavaScript" },
                { src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/openal/openal-original.svg", alt: "AI" },
              ].map((logo, i) => (
                <motion.div
                  key={logo.alt}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-card shadow-sm flex items-center justify-center p-2.5"
                >
                  <img src={logo.src} alt={logo.alt} className="w-full h-full object-contain" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* WhatsApp Community Banner */}
      <section className="bg-primary/5 border-y border-primary/10 py-6">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-heading font-semibold text-sm">Join Our Community</p>
              <p className="text-muted-foreground text-xs">Get instant course updates on WhatsApp.</p>
            </div>
          </div>
          <a
            href="https://wa.me/447741247592"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium text-sm hover:underline flex items-center gap-1 hover-scale"
          >
            Join WhatsApp Group <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      {/* Why Learn with Silicon Edge */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div {...fadeInUp} className="text-center mb-4">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">Why Learn with Silicon Edge</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Build better skills, <span className="text-gradient">faster</span><span className="text-gold">.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We understand the challenges of breaking into or advancing in the tech industry. That's why Silicon Edge Consulting is built on a foundation of active empowerment, ensuring every student not only learns but thrives.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
            {[
              { icon: BookOpen, title: "Instructor-Led Learning", desc: "Live classes mean active participation, instant answers, and continuous support." },
              { icon: Award, title: "Built for Completion", desc: "Structured, tutor-led learning ensures course completion and no drop-outs." },
              { icon: Briefcase, title: "Skills That Get You Hired", desc: "Industry-aligned curriculum builds practical skills and real-life projects." },
              { icon: Zap, title: "Beyond Certification", desc: "Job training equips you for local and remote IT roles." },
            ].map((prop, i) => (
              <motion.div
                key={prop.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl border border-border p-7 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <prop.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-base mb-2">{prop.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{prop.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse Categories - Horizontal Scroll Courses */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div {...fadeInUp}>
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">Browse Categories</p>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <h2 className="font-heading text-3xl md:text-4xl font-bold mb-2">The world's top courses</h2>
                <p className="text-muted-foreground">We keep adding new online video courses with new additions published every month.</p>
              </div>
              <Link to="/courses" className="text-primary font-medium text-sm flex items-center hover:underline hover-scale">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </motion.div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover-scale"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Horizontal scroll */}
          <div className="relative">
            <button
              onClick={() => scrollCourses("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all -ml-3 hover-scale"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollCourses("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all -mr-3 hover-scale"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

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

      {/* World-class Instructors */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">World-class Instructors</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
               Classes Taught by <span className="text-gradient">Industry Experts</span><span className="text-gold">.</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Silicon Edge teachers are icons, experts, and industry rock stars excited to share their experience, wisdom, and trusted tools with you.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {instructors.map((inst, i) => (
              <motion.div
                key={inst.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl border border-border p-6 text-center hover:shadow-lg hover:border-primary/20 transition-all group hover-scale"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4">
                  <img src={inst.image} alt={inst.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-heading font-semibold">{inst.name}</h3>
                <p className="text-muted-foreground text-sm mt-1">{inst.role}</p>
                <div className="flex items-center justify-center gap-1 mt-3">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span className="text-sm font-medium">{inst.rating}</span>
                </div>
                <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>{inst.students.toLocaleString()} Students</span>
                  <span>{inst.courses} Courses</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Your Mentors */}
      <section className="py-20 bg-hero">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeInUp}>
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
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.15 }}
                    viewport={{ once: true }}
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

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl overflow-hidden border border-primary/10 glow-purple"
            >
              <img src={courseBanner} alt="Cloud Engineering Crash Course" className="w-full h-full object-cover" />
            </motion.div>
          </div>
        </div>
      </section>




      {/* Testimonials */}
      <section className="py-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">Testimonials</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Don't just take <span className="text-gradient">our word for it</span>.
            </h2>
            <p className="text-muted-foreground">Join thousands learning on Silicon Edge</p>
          </motion.div>

          <div className="relative">
            <div className="flex animate-marquee gap-6" style={{ width: "max-content" }}>
              {[...testimonials, ...testimonials].map((t, i) => (
                <div key={i} className="w-[340px] bg-card rounded-xl border border-border p-6 space-y-4 flex-shrink-0">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-heading font-bold text-primary text-sm">
                        {t.name.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-hero py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div {...fadeInUp}>
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-3">Join more than 1 million learners worldwide</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-hero mb-4">
              Start Building your tech career
            </h2>
            <p className="text-hero-muted max-w-lg mx-auto mb-8">
              Effective learning starts with assessment. Learning a new skill is hard work, Silicon Edge makes it easier.
            </p>
            <Button size="lg" asChild className="hover-scale animate-pulse-glow">
              <Link to="/courses">
                Browse Courses <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
