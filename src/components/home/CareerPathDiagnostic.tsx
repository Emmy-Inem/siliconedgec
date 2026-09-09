import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Compass, 
  Cloud, 
  Terminal, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  RotateCcw, 
  Calendar, 
  Briefcase, 
  ShieldCheck, 
  Send,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Question {
  id: string;
  title: string;
  subtitle: string;
  options: {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const QUESTIONS: Question[] = [
  {
    id: "background",
    title: "What is your current technical background?",
    subtitle: "We tailor prerequisites to ensure you never feel left behind.",
    options: [
      {
        id: "beginner",
        label: "Complete Beginner / Career Switcher",
        description: "Little or no prior coding or infrastructure experience.",
        icon: Compass,
      },
      {
        id: "it-support",
        label: "IT Support / Systems Administration",
        description: "Familiar with basic networking, operating systems, or helpdesk.",
        icon: Terminal,
      },
      {
        id: "developer",
        label: "Software Engineer / Data Analyst",
        description: "Experience with scripting, programming, or databases.",
        icon: Cpu,
      },
      {
        id: "business",
        label: "Business Leader / Project Manager",
        description: "Looking to understand cloud architecture and lead tech teams.",
        icon: Briefcase,
      },
    ],
  },
  {
    id: "goal",
    title: "What is your primary career target?",
    subtitle: "Select the primary outcome you want to achieve from this training.",
    options: [
      {
        id: "cloud-engineer",
        label: "Cloud Engineer (Azure / AWS)",
        description: "Design, deploy, and manage production cloud infrastructure.",
        icon: Cloud,
      },
      {
        id: "devops",
        label: "DevOps & Automation Engineer",
        description: "Master CI/CD pipelines, Kubernetes, Docker, and Terraform.",
        icon: Terminal,
      },
      {
        id: "ai-data",
        label: "AI & Machine Learning Specialist",
        description: "Build, deploy, and scale machine learning models and data pipelines.",
        icon: Cpu,
      },
      {
        id: "executive",
        label: "Executive Cloud & Tech Strategy",
        description: "Make informed cloud architecture and vendor decisions for business.",
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: "schedule",
    title: "What schedule fits your commitment?",
    subtitle: "All live programs include lifetime recordings and mentor office hours.",
    options: [
      {
        id: "weekend",
        label: "Weekend Live Cohort",
        description: "Saturday & Sunday live sessions tailored for working professionals.",
        icon: Calendar,
      },
      {
        id: "evening",
        label: "Weekday Evening Intensive",
        description: "Twice-weekly evening classes with dedicated midweek lab assignments.",
        icon: Terminal,
      },
      {
        id: "flexible",
        label: "Self-Paced with Mentor Reviews",
        description: "Learn at your own pace with scheduled weekly 1-on-1 code reviews.",
        icon: Compass,
      },
    ],
  },
];

interface Recommendation {
  title: string;
  role: string;
  timeline: string;
  level: string;
  courseSlug: string;
  courseTitle: string;
  summary: string;
  keySkills: string[];
}

const RECOMMENDATIONS: Record<string, Recommendation> = {
  "cloud-engineer": {
    title: "Cloud Engineering Immersion Track",
    role: "Target Role: Junior to Mid-Level Cloud Engineer / Cloud Administrator",
    timeline: "8–12 Weeks (Part-time)",
    level: "Beginner to Intermediate Friendly",
    courseSlug: "/courses",
    courseTitle: "Cloud Engineering Career Track",
    summary: "Hands-on foundation starting from cloud fundamentals to enterprise Microsoft Azure and AWS architecture, subscriptions, security groups, and production deployment.",
    keySkills: ["Azure Architecture", "AWS Core", "Linux CLI", "IAM & Security", "Cost Optimization"],
  },
  devops: {
    title: "DevOps & Infrastructure as Code Track",
    role: "Target Role: DevOps Engineer / Platform Engineer / SRE",
    timeline: "10–12 Weeks (Intensive)",
    level: "Intermediate",
    courseSlug: "/courses",
    courseTitle: "DevOps & Automation Engineering",
    summary: "Master automation, containerization, and continuous delivery. Learn to provision immutable cloud infrastructure with Terraform and manage Kubernetes clusters.",
    keySkills: ["Docker & Containers", "Kubernetes", "Terraform IaC", "GitHub Actions CI/CD", "Prometheus Monitoring"],
  },
  "ai-data": {
    title: "Applied AI & Data Engineering Track",
    role: "Target Role: AI Engineer / Data Engineer",
    timeline: "8–10 Weeks",
    level: "Intermediate",
    courseSlug: "/courses",
    courseTitle: "Artificial Intelligence & Data Solutions",
    summary: "Learn modern data engineering pipelines, GenAI integrations, model deployment on cloud endpoints, and production LLM evaluation.",
    keySkills: ["Python for Data", "Cloud ML Endpoints", "Vector Databases", "Model Fine-Tuning", "ETL Pipelines"],
  },
  executive: {
    title: "Enterprise Cloud Leadership Track",
    role: "Target Role: Cloud Solutions Architect / Tech Lead / Enterprise IT Manager",
    timeline: "4–6 Weeks",
    level: "All Levels",
    courseSlug: "/for-businesses",
    courseTitle: "Cloud Strategy for Businesses & Leaders",
    summary: "Strategic training on multi-cloud governance, FinOps cloud cost management, cloud migration roadmaps, and compliance for corporate teams.",
    keySkills: ["Cloud Governance", "FinOps & ROI", "Multi-Cloud Strategy", "Vendor Assessment", "Security Compliance"],
  },
};

export function CareerPathDiagnostic() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const currentQ = QUESTIONS[step];
  const isLastStep = step === QUESTIONS.length;

  const handleSelect = (optionId: string) => {
    const updated = { ...answers, [currentQ.id]: optionId };
    setAnswers(updated);
    setStep((prev) => prev + 1);
  };

  const handleReset = () => {
    setStep(0);
    setAnswers({});
    setEmail("");
    setEmailSent(false);
  };

  const recommendation = RECOMMENDATIONS[answers.goal] ?? RECOMMENDATIONS["cloud-engineer"];

  const handleEmailRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("newsletter-subscribe", {
        body: {
          email: email.trim(),
          source: `career-quiz-${answers.goal || "cloud"}`,
        },
      });
      if (error) throw error;
      setEmailSent(true);
      toast({
        title: "Roadmap Requested",
        description: data?.already 
          ? "We have verified your email and queued your syllabus." 
          : "Check your inbox to confirm and receive your complete roadmap.",
      });
    } catch (err: any) {
      toast({ title: "Could not send roadmap", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl border border-border/70 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="border-b border-border/60 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Interactive Diagnostic</span>
          </div>
          <h3 className="font-heading text-lg font-bold text-foreground">Find Your Ideal Tech Training Track</h3>
        </div>

        {!isLastStep ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Step {step + 1} of {QUESTIONS.length}</span>
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs gap-1.5 h-8">
            <RotateCcw className="h-3.5 w-3.5" /> Start Over
          </Button>
        )}
      </div>

      {/* Body Content */}
      <div className="p-6 md:p-8">
        <AnimatePresence mode="wait">
          {!isLastStep ? (
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-6">
                <h4 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-1">
                  {currentQ.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {currentQ.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {currentQ.options.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelect(opt.id)}
                      className="group text-left p-4 rounded-2xl border border-border/70 hover:border-primary/50 bg-background/50 hover:bg-muted/30 transition-all duration-200 flex items-start gap-3.5 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors flex items-between justify-between">
                          <span>{opt.label}</span>
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {step > 0 && (
                <div className="mt-6 flex justify-start">
                  <Button variant="outline" size="sm" onClick={() => setStep((p) => p - 1)} className="text-xs">
                    ← Back to Previous Step
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Match Banner */}
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">Recommended Curriculum</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{recommendation.level}</span>
                    <span>•</span>
                    <span>{recommendation.timeline}</span>
                  </div>
                </div>

                <h4 className="font-heading text-2xl font-bold text-foreground mb-1">
                  {recommendation.title}
                </h4>
                <p className="text-xs font-medium text-primary mb-3">
                  {recommendation.role}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {recommendation.summary}
                </p>

                {/* Core Competencies */}
                <div className="pt-3 border-t border-primary/15">
                  <span className="text-xs font-semibold text-foreground/80 block mb-2">Core Skills & Architecture Covered:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {recommendation.keySkills.map((skill) => (
                      <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-background border border-border/80 text-foreground">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons & Lead Capture */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button asChild size="lg" className="w-full sm:w-auto font-medium">
                      <Link to={recommendation.courseSlug}>
                        Explore Track Courses <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                      <Link to="/for-businesses">
                        Talk to an Advisor
                      </Link>
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Next cohort enrolment is open. Live sessions with real cloud labs.
                  </p>
                </div>

                {/* Optional Email Capture */}
                <div className="rounded-2xl border border-border/70 p-4 bg-muted/20">
                  <span className="text-xs font-semibold text-foreground block mb-1">
                    Want the complete syllabus & roadmap?
                  </span>
                  <p className="text-xs text-muted-foreground mb-3">
                    We will send the detailed course outline and preparation guide directly to your inbox.
                  </p>

                  {!emailSent ? (
                    <form onSubmit={handleEmailRoadmap} className="flex gap-2">
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-background border border-border/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs shrink-0">
                        {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                        Send
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-emerald-500 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> Roadmap dispatched to your email!
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
