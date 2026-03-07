import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppFAB } from "@/components/WhatsAppFAB";
import { Button } from "@/components/ui/button";
import { Building2, Users, Target, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function ForBusinesses() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-hero pt-28 pb-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl">
            <p className="text-primary font-medium text-sm tracking-widest uppercase mb-4">Enterprise Solutions</p>
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-hero mb-4">
              Upskill Your Entire Team
            </h1>
            <p className="text-hero-muted text-lg leading-relaxed">
              Custom training programs designed for your organization's technology stack and growth objectives.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              { icon: Building2, title: "Custom Curriculum", desc: "Programs tailored to your company's tech stack and business goals." },
              { icon: Users, title: "Dedicated Cohorts", desc: "Private cohorts for your team with flexible scheduling." },
              { icon: Target, title: "Measurable Outcomes", desc: "Track ROI with detailed progress reports and skill assessments." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl border border-border p-8 text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Lead Form */}
          <div className="max-w-lg mx-auto">
            <h2 className="font-heading text-2xl font-bold text-center mb-8">Get a Custom Training Proposal</h2>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <input placeholder="Company Name" className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input placeholder="Your Full Name" className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input type="email" placeholder="Work Email" className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input placeholder="Team Size" className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <textarea placeholder="Tell us about your training needs..." rows={4} className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              <Button size="lg" className="w-full">
                Request Proposal <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}
