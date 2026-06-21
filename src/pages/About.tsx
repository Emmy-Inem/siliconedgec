import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Link } from "react-router-dom";
import { Award, Users, Target, Sparkles } from "lucide-react";

export default function About() {
  const { data: settings } = useSiteSettings();
  const brand = settings?.site_name || "Silicon Edge Consulting";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${brand}`,
    description: `Learn about ${brand}'s mission to deliver job-ready IT training.`,
    url: typeof window !== "undefined" ? `${window.location.origin}/about` : "/about",
  };

  const values = [
    { icon: Target, title: "Job-Ready Outcomes", body: "Every program is engineered to land roles, not just hand out certificates." },
    { icon: Users, title: "Live, Mentor-Led", body: "Learn from senior engineers in interactive cohorts, not pre-recorded silos." },
    { icon: Award, title: "Industry-Recognized", body: "Curricula aligned with AWS, Azure, GCP, and modern DevOps practices." },
    { icon: Sparkles, title: "Career Support", body: "Resume reviews, mock interviews, and direct introductions to hiring partners." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`About ${brand} — Our Mission`} description={`${brand} trains professionals into job-ready cloud, AI, and DevOps engineers.`} canonical="/about" jsonLd={jsonLd} />
      <Header />
      <main className="container mx-auto px-5 sm:px-6 py-16">
        <section className="max-w-3xl mx-auto text-center">
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-6">About {brand}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We exist to close the gap between learning and employment. {brand} combines live instruction,
            real-world projects, and dedicated career services so every learner graduates ready to ship.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 max-w-5xl mx-auto">
          {values.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-20 text-center">
          <h2 className="font-heading text-3xl font-bold mb-4">Ready to start?</h2>
          <p className="text-muted-foreground mb-6">Explore our catalog or talk with our team.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/courses" className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium">Browse Courses</Link>
            <Link to="/contact" className="px-6 py-3 rounded-lg border border-border font-medium">Contact Us</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}