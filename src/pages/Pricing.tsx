import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fallbackPlans = [
  { id: "1", name: "Starter", price: 0, period: "Free", features: ["Access to free courses", "Community forum access", "Basic certificates", "Email support"], highlight: false },
  { id: "2", name: "Professional", price: 49, period: "/month", features: ["All courses included", "Live instructor sessions", "Verified certificates", "Priority support", "Career coaching", "Project reviews"], highlight: true },
  { id: "3", name: "Enterprise", price: 199, period: "/month", features: ["Custom team training", "Dedicated account manager", "Analytics dashboard", "Bulk enrollment", "API access", "Custom certificates"], highlight: false },
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export default function Pricing() {
  const { data: plans } = useQuery({
    queryKey: ["pricing_plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_plans")
        .select("*")
        .order("order_index");
      if (error || !data || data.length === 0) return fallbackPlans;
      return data;
    },
  });

  const displayPlans = plans ?? fallbackPlans;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="bg-hero pt-28 pb-14">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-hero mb-3">
              Pricing<span className="text-gold">.</span>
            </h1>
            <p className="text-hero-muted text-lg max-w-xl">
              Simple, transparent pricing. Choose the plan that fits your goals.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {displayPlans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`rounded-2xl border p-8 transition-all hover-scale ${
                  plan.highlight
                    ? "bg-card border-primary shadow-xl shadow-primary/10 relative"
                    : "bg-card border-border"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="font-heading font-bold text-xl mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="font-heading text-4xl font-bold">
                    {plan.price === 0 ? "Free" : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {(plan.features ?? []).map((f: string) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  asChild
                >
                  <Link to="/sign-up">
                    {plan.price === 0 ? "Get Started Free" : "Start Free Trial"}
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
