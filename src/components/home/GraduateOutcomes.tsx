import { 
  Server, 
  GitPullRequest, 
  CheckCircle2, 
  Users2, 
  ShieldCheck 
} from "lucide-react";

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {OUTCOME_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={pillar.title} 
                className="rounded-2xl border border-border/70 bg-card/60 p-6 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div>
                  <Icon className="h-5 w-5 text-foreground mb-4" />
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
      </div>
    </section>
  );
}
