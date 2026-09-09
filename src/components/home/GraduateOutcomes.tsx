import { motion } from "framer-motion";
import { 
  Server, 
  GitPullRequest, 
  CheckCircle2, 
  Users2, 
  ShieldCheck, 
  Terminal, 
  Layers, 
  ArrowRight 
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const OUTCOME_PILLARS = [
  {
    icon: Server,
    title: "Production Cloud Lab Architecture",
    description: "Work directly inside live Microsoft Azure and AWS subscriptions. Provision virtual networks, resource groups, security policies, and IAM roles from day one.",
    highlight: "Live Cloud Consoles, Zero Mocks",
  },
  {
    icon: GitPullRequest,
    title: "Infrastructure as Code & Automation",
    description: "Write immutable infrastructure using Terraform, package microservices with Docker, and build robust automated deployment pipelines via GitHub Actions.",
    highlight: "Verifiable GitHub Capstone Portfolio",
  },
  {
    icon: Users2,
    title: "1-on-1 Senior Mentor Reviews",
    description: "Receive thorough architecture feedback and pull-request code reviews from active Cloud Solutions Architects and DevOps leads operating in global tech.",
    highlight: "Direct Industry Mentorship",
  },
  {
    icon: ShieldCheck,
    title: "Technical Interview & CV Readiness",
    description: "Practice real-world technical scenario interviews, architecture whiteboard questions, and optimize your portfolio to stand out in the global tech market.",
    highlight: "Job-Aligned Career Coaching",
  },
];

const COMPETENCY_TOOLS = [
  { name: "Microsoft Azure", slug: "azure" },
  { name: "Amazon Web Services", slug: "aws" },
  { name: "Terraform", slug: "terraform" },
  { name: "Docker", slug: "docker" },
  { name: "Kubernetes", slug: "kubernetes" },
  { name: "Linux Bash", slug: "linux" },
  { name: "GitHub Actions", slug: "githubactions" },
  { name: "Python", slug: "python" },
];

const METRICS = [
  { value: "100%", label: "Practical Lab Environment", detail: "Real cloud subscriptions, not slide presentations" },
  { value: "4–12 Wks", label: "Structured Immersion", detail: "Accelerated tracks designed for career transition" },
  { value: "5+ Capstones", label: "Production Projects", detail: "Production repos for interview discussions" },
  { value: "Lifetime", label: "Community & Recordings", detail: "Continuous access to curriculum updates" },
];

export function GraduateOutcomes() {
  return (
    <section className="py-20 md:py-28 border-t border-border/40 bg-muted/20 relative">
      <div className="container mx-auto px-5 sm:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Practical Competency &amp; Results
          </p>
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            Where Hands-On Cloud Skills Turn Into Real Careers<span className="text-gold">.</span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            We don't teach passive video tutorials. Our cohorts build, deploy, and troubleshoot production-grade enterprise infrastructure.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {OUTCOME_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={pillar.title} 
                className="rounded-2xl border border-border/70 bg-card/60 p-6 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading font-bold text-base text-foreground mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {pillar.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-border/50">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {pillar.highlight}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Real Metrics Banner */}
        <div className="rounded-3xl border border-border/80 bg-card/80 p-8 mb-16 shadow-sm">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
            {METRICS.map((m, idx) => (
              <div key={m.label} className={`${idx > 0 ? "pt-6 lg:pt-0 lg:pl-8" : ""}`}>
                <p className="font-heading text-3xl md:text-4xl font-extrabold text-foreground mb-1">
                  {m.value}
                </p>
                <p className="font-heading font-semibold text-sm text-primary mb-1">
                  {m.label}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {m.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Competency Toolstack */}
        <div className="rounded-2xl border border-border/60 bg-background/50 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-md">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary block mb-1">Enterprise Toolstack</span>
            <h4 className="font-heading font-bold text-lg text-foreground mb-1">Tools You Will Master Hands-On</h4>
            <p className="text-xs text-muted-foreground">The industry-standard tooling powering modern cloud and DevOps organizations.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {COMPETENCY_TOOLS.map((tool) => (
              <div 
                key={tool.name}
                className="px-3 py-1.5 rounded-lg border border-border/80 bg-muted/40 text-xs font-medium text-foreground/90 flex items-center gap-2"
              >
                <Terminal className="h-3.5 w-3.5 text-primary" />
                <span>{tool.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
