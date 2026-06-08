import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Rec { headline: string; message: string; cta_label: string; cta_href: string; kind: string }

export function NextStepCard({ userId }: { userId: string }) {
  const [rec, setRec] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("ai-recommend", { body: {} });
      if (!error && data) setRec(data as Rec);
      setLoading(false);
    })();
  }, [userId]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent p-5 md:p-6">
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="flex items-start gap-4 relative">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center shrink-0">
          <Star className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary mb-1 font-semibold">AI Coach · Your next step</p>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2"><Loader2 className="h-4 w-4 animate-spin" />Personalising your next step…</div>
          ) : rec ? (
            <>
              <h3 className="font-heading text-lg md:text-xl font-bold mb-1">{rec.headline}</h3>
              <p className="text-sm text-muted-foreground mb-3">{rec.message}</p>
              <Button asChild size="sm">
                <Link to={rec.cta_href}>{rec.cta_label}<ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Browse the catalog to start a new track.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}