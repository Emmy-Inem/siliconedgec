import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GraduationCap, Shield, Download, ExternalLink, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export default function Certificates() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-hero pt-28 pb-14">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-hero mb-3">Certificates</h1>
            <p className="text-hero-muted text-lg max-w-xl">
              Earn verified, industry-recognized certificates that prove your skills to employers.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              { icon: GraduationCap, title: "Complete a Course", desc: "Finish all modules and pass the final assessment to earn your certificate." },
              { icon: Shield, title: "Digitally Verified", desc: "Each certificate includes a unique verification ID that employers can validate." },
              { icon: ExternalLink, title: "Share Everywhere", desc: "Add to LinkedIn, share on social media, or embed on your portfolio site." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl border border-border p-8 text-center hover:border-primary/30 hover:shadow-lg transition-all hover-scale"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Sample Certificate */}
          <motion.div {...fadeInUp} className="max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl border-2 border-primary/20 p-10 text-center shadow-xl shadow-primary/5">
              <div className="flex justify-center mb-4">
                <Award className="h-12 w-12 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.25em] mb-4">Certificate of Completion</p>
              <div className="w-10 h-0.5 bg-primary mx-auto mb-6" />
              <p className="font-heading font-bold text-2xl mb-2">Silicon Edge Consulting</p>
              <p className="text-muted-foreground mb-6">This is to certify that</p>
              <p className="font-heading font-bold text-primary text-3xl mb-2 italic">Your Name</p>
              <p className="text-muted-foreground mb-6">has successfully completed</p>
              <p className="font-heading font-semibold text-xl mb-8">Cloud Engineering Crash Course</p>
              <div className="border-t border-border pt-6 flex justify-between items-end">
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Date Issued</p>
                  <p className="text-sm font-medium">March 7, 2026</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Certificate ID</p>
                  <p className="text-sm font-medium font-mono">SE-2026-A1B2C3</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Ready to earn your certificate?</p>
            <Button size="lg" asChild className="hover-scale">
              <Link to="/courses">Browse Courses</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
