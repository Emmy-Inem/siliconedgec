import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Award, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function VerifyCertificateLanding() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    navigate(`/verify/${encodeURIComponent(c)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Verify a Silicon Edge Certificate"
        description="Enter a certificate ID to confirm its authenticity and view the recipient, course, and issue date."
      />
      <Header />
      <section className="pt-28 pb-20 min-h-[60vh]">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center mb-4">
                <Award className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-heading text-3xl font-bold">Verify a Certificate</h1>
              <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
                Enter the certificate ID printed on the certificate (for example,
                <code className="font-mono text-xs mx-1">SE-2026-A1B2C3</code>)
                to confirm it was issued by Silicon Edge.
              </p>
            </div>

            <form onSubmit={onSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <label className="block text-sm font-medium">Certificate ID</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SE-2026-XXXXXX"
                className="font-mono"
                autoFocus
              />
              <Button type="submit" className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Verify Certificate
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Tip: you can also visit <span className="font-mono">/verify/&lt;code&gt;</span> directly.
              </p>
            </form>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}