import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Coins, LineChart, Users, Loader2 } from "lucide-react";

const BENEFITS = [
  { icon: Coins, title: "Up to 20% commission", body: "Earn on every learner who enrols through your referral link — paid in Naira, monthly." },
  { icon: LineChart, title: "Private performance dashboard", body: "Track clicks, sign-ups, conversions and payouts. You only ever see your own numbers." },
  { icon: Users, title: "Marketing support", body: "Get creatives, course briefs and discount codes tailored to your audience." },
];

function slugifyCode(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 20) || "affiliate"
  );
}

export default function Affiliates() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    audience: "",
    channels: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    try {
      const code = `${slugifyCode(form.full_name)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("affiliates").insert({
        user_id: auth?.user?.id ?? null,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        audience: form.audience.trim() || null,
        channels: form.channels.trim() || null,
        code,
        status: "pending",
      } as any);
      if (error) throw error;
      setDone(true);
      toast({ title: "Application received", description: "We'll review and get back to you shortly." });
    } catch (err: any) {
      toast({ title: "Could not submit", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Affiliate Marketing Partner Program | Silicon Edge Consulting"
        description="Earn commission promoting job-ready AI, Cloud and DevOps training. Apply to the Silicon Edge affiliate program and track every referral in your own dashboard."
      />
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/10 to-background pt-28 pb-16">
          <div className="container mx-auto px-4 max-w-4xl text-center space-y-5">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary">
              Careers · Affiliate Marketing
            </span>
            <h1 className="font-heading text-4xl md:text-5xl font-bold">
              Get paid to grow Africa's next tech workforce
            </h1>
            <p className="text-muted-foreground text-lg">
              Join the Silicon Edge Consulting affiliate program. Share your unique link, bring learners
              into our AI, Cloud and DevOps bootcamps, and earn commission on every enrolment.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-14 grid gap-6 md:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border-border/60">
              <CardHeader className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-heading">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
            </Card>
          ))}
        </section>

        <section className="container mx-auto px-4 pb-20 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Apply to become an affiliate</CardTitle>
            </CardHeader>
            <CardContent>
              {done ? (
                <div className="text-center py-10 space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                  <h2 className="font-heading text-xl font-semibold">Application received</h2>
                  <p className="text-sm text-muted-foreground">
                    Once approved you'll get your referral code and access to your affiliate dashboard.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="aff-name">Full name</Label>
                      <Input id="aff-name" required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aff-email">Email</Label>
                      <Input id="aff-email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aff-phone">Phone (optional)</Label>
                    <Input id="aff-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aff-audience">Who is your audience?</Label>
                    <Textarea id="aff-audience" rows={3} value={form.audience} onChange={(e) => set("audience", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aff-channels">Where will you promote? (links to socials, blog, community)</Label>
                    <Textarea id="aff-channels" rows={3} value={form.channels} onChange={(e) => set("channels", e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Submit application
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}