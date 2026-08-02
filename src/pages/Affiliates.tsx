import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";
import {
  CheckCircle2, Coins, LineChart, Users, Loader2, Link2, Share2, Wallet, ClipboardList,
} from "lucide-react";
import heroAsset from "@/assets/career-hero-team.png.asset.json";
import communityAsset from "@/assets/career-earnings.jpg.asset.json";
import payoutAsset from "@/assets/career-mobile-tracking.jpg.asset.json";

const heroImg = heroAsset.url;
const communityImg = communityAsset.url;
const payoutImg = payoutAsset.url;

const BENEFITS = [
  { icon: Coins, title: "Up to 20% commission", body: "Earn on every learner who enrols through your referral link — paid out monthly, worldwide." },
  { icon: LineChart, title: "Private performance dashboard", body: "Track clicks, sign-ups, conversions and payouts. You only ever see your own numbers." },
  { icon: Users, title: "Marketing support", body: "Get creatives, course briefs and discount codes tailored to your audience." },
];

const STEPS = [
  { icon: ClipboardList, title: "Apply", body: "Tell us about your audience and where you'll promote. Approval usually takes 48 hours." },
  { icon: CheckCircle2, title: "Pick your courses", body: "Choose the courses you genuinely believe in — you get a link for each approved course." },
  { icon: Share2, title: "Share your link", body: "Post it anywhere: WhatsApp, X, LinkedIn, newsletters, communities, YouTube descriptions." },
  { icon: Wallet, title: "Get paid", body: "Commission is confirmed once a learner pays, and settled to your bank every month." },
];

const AUDIENCES = [
  { title: "Content creators", body: "Tech YouTubers, newsletter writers and X/LinkedIn creators with an audience learning cloud, AI or DevOps." },
  { title: "Community leads", body: "Admins of WhatsApp, Telegram, Slack or Discord communities of aspiring tech professionals." },
  { title: "Corporate trainers", body: "Consultants and L&D partners placing teams into structured, job-ready training." },
  { title: "Alumni & mentors", body: "Past learners who already recommend Silicon Edge — now get rewarded for it." },
];

const TIERS = [
  { tier: "Starter", refs: "1 – 5 paid enrolments / month", rate: "10%" },
  { tier: "Growth", refs: "6 – 15 paid enrolments / month", rate: "15%" },
  { tier: "Partner", refs: "16+ paid enrolments / month", rate: "20%" },
];

const FAQS = [
  { q: "How much can I earn?", a: "Commission starts at 10% of the amount a learner pays and rises to 20% as your volume grows." },
  { q: "How long does my referral link track for?", a: "Your referral is stored on the visitor's device for 30 days, so you're still credited if they come back later to enrol." },
  { q: "When do I get paid?", a: "Commission is confirmed when the learner's payment clears. Payouts run monthly, once your confirmed balance passes the minimum threshold shown in your dashboard." },
  { q: "Do I need to be a past student?", a: "No. Anyone with a relevant audience can apply — creators, community leads, trainers and alumni are all welcome." },
  { q: "Can I promote more than one course?", a: "Yes. Select as many published courses as you like; each approved course gets its own trackable link and its own performance stats." },
  { q: "Can I choose where my link sends people?", a: "Yes. In your partner dashboard you can point each link at the course page, the checkout, the pricing page or the homepage." },
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
  const { format: formatPrice } = useLocalizedPrice();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [refsPerMonth, setRefsPerMonth] = useState(5);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    audience: "",
    channels: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: courses = [] } = useQuery({
    queryKey: ["career-published-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, slug, price")
        .eq("is_published", true)
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const avgPrice =
    courses.length > 0
      ? Math.round(
          courses.reduce((s: number, c: any) => s + Number(c.price ?? 0), 0) / courses.length,
        )
      : 75000;
  const rate = refsPerMonth >= 16 ? 0.2 : refsPerMonth >= 6 ? 0.15 : 0.1;
  const monthly = Math.round(refsPerMonth * avgPrice * rate);

  const toggleCourse = (id: string) =>
    setCourseIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    try {
      const code = `${slugifyCode(form.full_name)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: auth } = await supabase.auth.getUser();
      const { data: created, error } = await supabase.from("affiliates").insert({
        user_id: auth?.user?.id ?? null,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        audience: form.audience.trim() || null,
        channels: form.channels.trim() || null,
        code,
        status: "pending",
      } as any).select("id").maybeSingle();
      if (error) throw error;
      if (created?.id && courseIds.length) {
        const byId = Object.fromEntries(courses.map((c: any) => [c.id, c]));
        await (supabase as any).from("affiliate_course_selections").insert(
          courseIds.map((cid) => ({
            affiliate_id: created.id,
            course_id: cid,
            status: "pending",
            landing_path: `/courses/${byId[cid]?.slug ?? cid}`,
          })),
        );
      }
      setDone(true);
      toast({ title: "Application received", description: "We'll review and get back to you shortly." });
    } catch (err: any) {
      toast({ title: "Could not submit", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Career Partner Program | Silicon Edge Consulting"
        description="Earn up to 20% commission promoting job-ready AI, Cloud and DevOps courses. Get a trackable link per course, a private dashboard and monthly payouts."
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/10 to-background pt-28 pb-16">
          <div className="container mx-auto px-4 grid gap-10 lg:grid-cols-2 items-center">
            <div className="space-y-5">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary">
                Career · Partner Program
              </span>
              <h1 className="font-heading text-4xl md:text-5xl font-bold leading-tight">
                Build a career growing the world's next tech workforce
              </h1>
              <p className="text-muted-foreground text-lg">
                Join the Silicon Edge Consulting partner program. Pick the courses you want to promote,
                share your unique link for each one, and earn commission on every enrolment.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg"><a href="#apply">Apply to become a partner</a></Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/career/dashboard">Partner dashboard</Link>
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 max-w-md">
                {[
                  { k: "Up to 20%", v: "Commission" },
                  { k: "30 days", v: "Cookie window" },
                  { k: "Monthly", v: "Global payouts" },
                ].map((s) => (
                  <div key={s.v}>
                    <p className="font-heading text-xl font-bold">{s.k}</p>
                    <p className="text-xs text-muted-foreground">{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative order-first lg:order-last">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-gold/20 rounded-3xl blur-2xl" aria-hidden="true" />
              <img
                src={heroImg}
                alt="Marketing team reviewing partner campaign performance on a laptop"
                width={1024}
                height={1057}
                className="relative rounded-2xl shadow-xl w-full h-auto object-cover lg:ml-auto lg:max-w-md"
              />
            </div>
          </div>
        </section>

        {/* Benefits */}
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

        {/* How it works */}
        <section className="bg-muted/40 py-16">
          <div className="container mx-auto px-4 space-y-8">
            <div className="max-w-2xl">
              <h2 className="font-heading text-3xl font-bold">How it works</h2>
              <p className="text-muted-foreground mt-2">Four steps from application to your first payout.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <Card key={title} className="border-border/60">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base font-heading">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="container mx-auto px-4 py-16 grid gap-10 lg:grid-cols-2 items-center">
          <img
            src={communityImg}
            alt="Two partners counting their referral earnings at a desk"
            loading="lazy"
            width={1280}
            height={853}
            className="rounded-2xl shadow-lg w-full h-auto object-cover order-last lg:order-first"
          />
          <div className="space-y-5">
            <h2 className="font-heading text-3xl font-bold">Who this is for</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {AUDIENCES.map((a) => (
                <div key={a.title} className="rounded-xl border border-border/60 p-4">
                  <p className="font-semibold text-sm">{a.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Commission & payouts */}
        <section className="bg-muted/40 py-16">
          <div className="container mx-auto px-4 grid gap-10 lg:grid-cols-2 items-center">
            <div className="space-y-5">
              <h2 className="font-heading text-3xl font-bold">Commission &amp; payouts</h2>
              <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="text-left p-3 font-semibold">Tier</th>
                      <th className="text-left p-3 font-semibold">Monthly volume</th>
                      <th className="text-left p-3 font-semibold">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TIERS.map((t) => (
                      <tr key={t.tier} className="border-t border-border/50">
                        <td className="p-3 font-medium">{t.tier}</td>
                        <td className="p-3 text-muted-foreground">{t.refs}</td>
                        <td className="p-3 font-semibold text-primary">{t.rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-2"><Link2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> 30-day attribution window on every referral link.</li>
                <li className="flex gap-2"><Wallet className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Payouts run monthly, once your confirmed balance passes the minimum threshold.</li>
                <li className="flex gap-2"><LineChart className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Commission confirms as soon as the learner's payment clears.</li>
              </ul>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-xl">Earnings estimator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <Label>Paid referrals per month</Label>
                    <span className="font-semibold">{refsPerMonth}</span>
                  </div>
                  <Slider
                    value={[refsPerMonth]}
                    min={1}
                    max={30}
                    step={1}
                    onValueChange={(v) => setRefsPerMonth(v[0])}
                    aria-label="Paid referrals per month"
                  />
                </div>
                <div className="rounded-xl bg-primary/5 p-5 space-y-1">
                  <p className="text-xs text-muted-foreground">Estimated monthly commission</p>
                  <p className="font-heading text-3xl font-bold text-primary">{formatPrice(monthly)}</p>
                  <p className="text-xs text-muted-foreground">
                    At {Math.round(rate * 100)}% on an average course price of {formatPrice(avgPrice)}.
                  </p>
                </div>
                <img
                  src={payoutImg}
                  alt="Partner checking her payout balance on a mobile banking app"
                  loading="lazy"
                  width={736}
                  height={1104}
                  className="rounded-xl w-full h-40 object-cover"
                />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto px-4 py-16 max-w-3xl">
          <h2 className="font-heading text-3xl font-bold mb-6">Partner FAQ</h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Application */}
        <section id="apply" className="container mx-auto px-4 pb-20 max-w-2xl scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Apply to become a partner</CardTitle>
            </CardHeader>
            <CardContent>
              {done ? (
                <div className="text-center py-10 space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                  <h3 className="font-heading text-xl font-semibold">Application received</h3>
                  <p className="text-sm text-muted-foreground">
                    Once approved you'll get a referral link for each course you chose, plus access to your
                    partner dashboard.
                  </p>
                  <Button asChild variant="outline"><Link to="/career/dashboard">Go to dashboard</Link></Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="aff-name">Full name</Label>
                      <Input id="aff-name" required maxLength={100} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aff-email">Email</Label>
                      <Input id="aff-email" type="email" required maxLength={255} value={form.email} onChange={(e) => set("email", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aff-phone">Phone (optional)</Label>
                    <Input id="aff-phone" maxLength={30} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aff-audience">Who is your audience?</Label>
                    <Textarea id="aff-audience" rows={3} maxLength={1000} value={form.audience} onChange={(e) => set("audience", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aff-channels">Where will you promote? (links to socials, blog, community)</Label>
                    <Textarea id="aff-channels" rows={3} maxLength={1000} value={form.channels} onChange={(e) => set("channels", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Which courses do you want to promote?</Label>
                    <p className="text-xs text-muted-foreground">
                      Pick one or more. You'll get a unique referral link per approved course.
                    </p>
                    <div className="max-h-56 overflow-y-auto rounded-md border border-border/60 divide-y divide-border/40">
                      {courses.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-3">No published courses available yet.</p>
                      ) : (
                        courses.map((c: any) => (
                          <label key={c.id} className="flex items-start gap-3 p-3 cursor-pointer">
                            <Checkbox
                              checked={courseIds.includes(c.id)}
                              onCheckedChange={() => toggleCourse(c.id)}
                            />
                            <span className="text-sm leading-snug">{c.title}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Submit application
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Already a partner? <Link to="/career/dashboard" className="text-primary underline">Open your dashboard</Link>
                  </p>
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
