import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, Copy, MousePointerClick, Users, Wallet, TrendingUp,
  GraduationCap, Share2, Linkedin, Download,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeCanvas } from "qrcode.react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/format-currency";
import { siteUrl } from "@/lib/site-url";
import { buildAffiliateLink, defaultLandingPath, landingOptions } from "@/lib/affiliate-link";

type Row = Record<string, any>;

const MIN_PAYOUT = 10000;

export default function AffiliateDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-self", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // RLS scopes every query below to this affiliate only.
      const { data: affiliate } = await supabase
        .from("affiliates").select("*").eq("user_id", user!.id).maybeSingle();
      if (!affiliate) return null;
      const id = (affiliate as any).id;
      const [{ data: clicks }, { data: referrals }, { data: payouts }, { data: selections }] =
        await Promise.all([
          supabase.from("affiliate_clicks").select("id, course_id, created_at").eq("affiliate_id", id),
          supabase.from("affiliate_referrals").select("*").eq("affiliate_id", id).order("created_at", { ascending: false }),
          supabase.from("affiliate_payouts").select("*").eq("affiliate_id", id).order("created_at", { ascending: false }),
          (supabase as any).from("affiliate_course_selections").select("*").eq("affiliate_id", id),
        ]);
      const courseIds = Array.from(new Set([
        ...(selections ?? []).map((s: Row) => s.course_id),
        ...(referrals ?? []).map((r: Row) => r.course_id).filter(Boolean),
      ]));
      const { data: courses } = courseIds.length
        ? await supabase.from("courses").select("id, title, slug, price").in("id", courseIds)
        : { data: [] as Row[] };
      return {
        affiliate: affiliate as Row,
        clicks: (clicks ?? []) as Row[],
        referrals: (referrals ?? []) as Row[],
        payouts: (payouts ?? []) as Row[],
        selections: (selections ?? []) as Row[],
        courses: (courses ?? []) as Row[],
      };
    },
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ["affiliate-course-options"],
    enabled: !!data?.affiliate,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("courses").select("id, title, slug").eq("is_published", true).order("title");
      return (rows ?? []) as Row[];
    },
  });

  const affiliate = data?.affiliate;
  const referrals = data?.referrals ?? [];
  const payouts = data?.payouts ?? [];
  const clicks = data?.clicks ?? [];
  const selections = data?.selections ?? [];
  const courseById = useMemo(
    () => Object.fromEntries((data?.courses ?? []).map((c) => [c.id, c])),
    [data?.courses],
  );

  const earned = referrals.reduce((s, r) => s + Number(r.commission ?? 0), 0);
  const paid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const pending = Math.max(earned - paid, 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const earnedThisMonth = referrals
    .filter((r) => new Date(r.created_at).getTime() >= monthStart)
    .reduce((s, r) => s + Number(r.commission ?? 0), 0);
  const clicksSeries = useMemo(() => {
    const days: { day: string; clicks: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        day: key.slice(5),
        clicks: clicks.filter((c) => String(c.created_at).slice(0, 10) === key).length,
      });
    }
    return days;
  }, [clicks]);
  const lastPayout = payouts.find((p) => p.status === "paid");
  const conversions = referrals.filter((r) => String(r.conversion_type).includes("paid"));
  const signups = referrals.length - conversions.length;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const share = (url: string, title: string, network: "whatsapp" | "x" | "linkedin") => {
    const text = `Learn ${title} with Silicon Edge Consulting`;
    const map = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
    window.open(map[network], "_blank", "noopener,noreferrer");
  };

  const requestCourse = async (courseId: string) => {
    if (!affiliate) return;
    setSaving(true);
    const { error } = await (supabase as any).from("affiliate_course_selections").insert({
      affiliate_id: affiliate.id, course_id: courseId, status: "pending",
    });
    setSaving(false);
    if (error) return toast({ title: "Could not add course", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["affiliate-self", user?.id] });
    toast({ title: "Course requested", description: "An admin will review and approve it." });
  };

  const removeSelection = async (id: string) => {
    const { error } = await (supabase as any).from("affiliate_course_selections").delete().eq("id", id);
    if (error) return toast({ title: "Could not remove", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["affiliate-self", user?.id] });
  };

  const saveProfile = async (patch: Row) => {
    if (!affiliate) return;
    setSaving(true);
    const { error } = await supabase.from("affiliates").update(patch as any).eq("id", affiliate.id);
    setSaving(false);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["affiliate-self", user?.id] });
    toast({ title: "Profile updated" });
  };

  const saveLanding = async (selectionId: string, landingPath: string) => {
    const { error } = await (supabase as any)
      .from("affiliate_course_selections")
      .update({ landing_path: landingPath })
      .eq("id", selectionId);
    if (error) return toast({ title: "Could not save destination", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["affiliate-self", user?.id] });
    toast({ title: "Destination saved" });
  };

  const requestPayout = async () => {
    setRequestingPayout(true);
    const { error } = await supabase.rpc("request_affiliate_payout");
    setRequestingPayout(false);
    if (error) return toast({ title: "Payout request failed", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["affiliate-self", user?.id] });
    toast({ title: "Payout requested", description: "Your request is now awaiting review." });
  };

  const statsFor = (courseId: string) => {
    const refs = referrals.filter((r) => r.course_id === courseId);
    return {
      clicks: clicks.filter((c) => c.course_id === courseId).length,
      signups: refs.filter((r) => !String(r.conversion_type).includes("paid")).length,
      conversions: refs.filter((r) => String(r.conversion_type).includes("paid")).length,
      earned: refs.reduce((s, r) => s + Number(r.commission ?? 0), 0),
    };
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Partner Dashboard | Silicon Edge Consulting" description="Track your referral clicks, conversions and commission payouts." />
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-28 pb-16 space-y-6">
        {authLoading || isLoading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !user ? (
          <Card className="max-w-lg mx-auto text-center p-10 space-y-4">
            <h1 className="font-heading text-xl font-bold">Sign in to view your partner dashboard</h1>
            <Button asChild><Link to="/sign-in">Sign in</Link></Button>
          </Card>
        ) : !affiliate ? (
          <Card className="max-w-lg mx-auto text-center p-10 space-y-4">
            <h1 className="font-heading text-xl font-bold">No partner account yet</h1>
            <p className="text-sm text-muted-foreground">Apply to the Career partner program to get your referral links and dashboard.</p>
            <Button asChild><Link to="/career">Apply now</Link></Button>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-heading text-3xl font-bold">Partner dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  {affiliate.full_name} · {affiliate.commission_percentage}% default commission
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={affiliate.status === "approved" ? "default" : "secondary"} className="capitalize">
                  {affiliate.status}
                </Badge>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to="/dashboard"><GraduationCap className="h-4 w-4" /> Student view</Link>
                </Button>
              </div>
            </div>

            {!affiliate.payout_details && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <strong>Add your payout details</strong> — we can't send your commission until your bank
                account is on file. Add it under <em>Settings</em>.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { icon: MousePointerClick, label: "Clicks", value: String(clicks.length) },
                { icon: Users, label: "Sign-ups", value: String(signups) },
                { icon: TrendingUp, label: "Conversions", value: String(conversions.length) },
                { icon: Wallet, label: "Earned this month", value: formatNaira(earnedThisMonth) },
                { icon: Wallet, label: "Lifetime commission", value: formatNaira(earned) },
                { icon: Wallet, label: "Pending payout", value: formatNaira(pending) },
              ].map(({ icon: Icon, label, value }) => (
                <Card key={label}>
                  <CardContent className="p-5 space-y-1">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-heading text-xl font-bold">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="links">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="links">Referral links</TabsTrigger>
                <TabsTrigger value="courses">Per-course</TabsTrigger>
                <TabsTrigger value="conversions">Conversions</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
                <TabsTrigger value="materials">Marketing materials</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="links" className="space-y-4 pt-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">General link</CardTitle></CardHeader>
                  <CardContent className="flex flex-col sm:flex-row gap-2">
                    <Input readOnly value={siteUrl(`/?ref=${affiliate.code}`)} />
                    <Button variant="outline" className="gap-2" onClick={() => copy(siteUrl(`/?ref=${affiliate.code}`))}>
                      <Copy className="h-4 w-4" /> Copy
                    </Button>
                  </CardContent>
                </Card>

                {selections.length === 0 ? (
                  <Card><CardContent className="p-6 text-sm text-muted-foreground">
                    No courses selected yet — add courses under Settings to get a link per course.
                  </CardContent></Card>
                ) : selections.map((s) => (
                  <SelectionLinkCard
                    key={s.id}
                    selection={s}
                    course={courseById[s.course_id]}
                    fallbackCode={affiliate.code}
                    onCopy={copy}
                    onShare={share}
                    onSaveLanding={saveLanding}
                  />
                ))}
              </TabsContent>

              <TabsContent value="courses" className="pt-4">
                <Card className="mb-4">
                  <CardHeader><CardTitle className="text-base">Clicks — last 30 days</CardTitle></CardHeader>
                  <CardContent className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={clicksSeries}>
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                        <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Performance by course</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    {selections.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">No courses yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course</TableHead><TableHead>Clicks</TableHead><TableHead>Sign-ups</TableHead>
                            <TableHead>Conversions</TableHead><TableHead>Commission</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selections.map((s) => {
                            const st = statsFor(s.course_id);
                            return (
                              <TableRow key={s.id}>
                                <TableCell>{courseById[s.course_id]?.title ?? "—"}</TableCell>
                                <TableCell>{st.clicks}</TableCell>
                                <TableCell>{st.signups}</TableCell>
                                <TableCell>{st.conversions}</TableCell>
                                <TableCell>{formatNaira(st.earned)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="conversions" className="pt-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Conversion history</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    {referrals.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">No referrals recorded yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead><TableHead>Course</TableHead><TableHead>Referred user</TableHead>
                            <TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Commission</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {referrals.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>{courseById[r.course_id]?.title ?? "—"}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {r.user_id ? `Learner ${String(r.user_id).slice(0, 4).toUpperCase()}` : "—"}
                              </TableCell>
                              <TableCell className="capitalize">{String(r.conversion_type).replace(/_/g, " ")}</TableCell>
                              <TableCell>{formatNaira(Number(r.amount ?? 0))}</TableCell>
                              <TableCell>{formatNaira(Number(r.commission ?? 0))}</TableCell>
                              <TableCell><Badge variant="secondary" className="capitalize">{r.status}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payouts" className="pt-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Payouts</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Payouts run monthly once your confirmed balance passes {formatNaira(MIN_PAYOUT)}.
                      Pending balance: <strong>{formatNaira(pending)}</strong>
                      {lastPayout && ` · last payout ${new Date(lastPayout.paid_at ?? lastPayout.created_at).toLocaleDateString()}`}.
                    </p>
                    <Button
                      onClick={requestPayout}
                      disabled={requestingPayout || pending < MIN_PAYOUT || !affiliate.payout_details || payouts.some((p) => ["pending", "processing", "approved"].includes(p.status))}
                    >
                      {requestingPayout ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
                      Request {formatNaira(pending)} payout
                    </Button>
                    {payouts.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">No payouts yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Reference</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                          {payouts.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>{new Date(p.paid_at ?? p.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>{formatNaira(Number(p.amount ?? 0))}</TableCell>
                              <TableCell><Badge variant="secondary" className="capitalize">{p.status}</Badge></TableCell>
                              <TableCell className="text-muted-foreground">{p.reference ?? "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="materials" className="pt-4 space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Course briefs</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {selections.filter((s) => s.status === "approved").length === 0 ? (
                      <p className="text-sm text-muted-foreground">Approved courses will show copy-ready briefs here.</p>
                    ) : selections.filter((s) => s.status === "approved").map((s) => {
                      const course = courseById[s.course_id];
                      const url = buildAffiliateLink(
                        defaultLandingPath(s, course),
                        s.referral_code || affiliate.code,
                      );
                      const brief = `${course?.title ?? "Silicon Edge course"} — job-ready training from Silicon Edge Consulting. Live cohorts, hands-on projects and a certificate on completion.\n\nEnrol here: ${url}`;
                      return (
                        <div key={s.id} className="rounded-lg border border-border/60 p-4 space-y-2">
                          <p className="font-medium text-sm">{course?.title}</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{brief}</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => copy(brief)}>
                              <Copy className="h-3.5 w-3.5" /> Copy brief
                            </Button>
                            {course?.slug && (
                              <Button size="sm" variant="ghost" asChild className="gap-2">
                                <a href={siteUrl(`/courses/${course.slug}`)} target="_blank" rel="noreferrer">
                                  <Download className="h-3.5 w-3.5" /> View course page
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="pt-4 space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Contact & payout details</CardTitle></CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="a-phone">Phone</Label>
                      <Input id="a-phone" defaultValue={affiliate.phone ?? ""}
                        onBlur={(e) => e.target.value !== (affiliate.phone ?? "") && saveProfile({ phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="a-payout">Payout details (bank / account)</Label>
                      <Input id="a-payout" defaultValue={affiliate.payout_details ?? ""}
                        onBlur={(e) => e.target.value !== (affiliate.payout_details ?? "") && saveProfile({ payout_details: e.target.value })} />
                    </div>
                    {saving && <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle className="text-base">Courses you promote</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setAddOpen((o) => !o)}>
                      {addOpen ? "Done" : "Add course"}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selections.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3">
                        <div>
                          <p className="text-sm font-medium">{courseById[s.course_id]?.title ?? "Course"}</p>
                          <p className="text-xs text-muted-foreground capitalize">{s.status}</p>
                        </div>
                        {s.status === "pending" && (
                          <Button size="sm" variant="ghost" onClick={() => removeSelection(s.id)}>Remove</Button>
                        )}
                      </div>
                    ))}
                    {addOpen && (
                      <div className="max-h-56 overflow-y-auto rounded-md border border-border/60 divide-y divide-border/40">
                        {allCourses
                          .filter((c) => !selections.some((s) => s.course_id === c.id))
                          .map((c) => (
                            <label key={c.id} className="flex items-center gap-3 p-3 cursor-pointer">
                              <Checkbox checked={false} onCheckedChange={() => requestCourse(c.id)} />
                              <span className="text-sm">{c.title}</span>
                            </label>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function SelectionLinkCard({
  selection, course, fallbackCode, onCopy, onShare, onSaveLanding,
}: {
  selection: Row;
  course?: Row;
  fallbackCode: string;
  onCopy: (text: string) => void;
  onShare: (url: string, title: string, network: "whatsapp" | "x" | "linkedin") => void;
  onSaveLanding: (selectionId: string, landingPath: string) => void;
}) {
  const options = landingOptions(course);
  const [path, setPath] = useState(defaultLandingPath(selection, course));
  const [campaign, setCampaign] = useState("");
  const qrRef = useRef<HTMLDivElement | null>(null);
  const code = selection.referral_code || fallbackCode;
  const url = buildAffiliateLink(path, code, campaign);
  const approved = selection.status === "approved";
  const dirty = path !== defaultLandingPath(selection, course);

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${code}-qr.png`;
    a.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <CardTitle className="text-base">{course?.title ?? "Course"}</CardTitle>
        <Badge variant={approved ? "default" : "secondary"} className="capitalize shrink-0">{selection.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {!approved && (
          <p className="text-sm text-muted-foreground">
            Awaiting admin approval. You can already set up the link — it starts tracking once approved.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Send visitors to</Label>
            <Select value={path} onValueChange={(v) => setPath(v)}>
              <SelectTrigger><SelectValue placeholder="Choose destination" /></SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Campaign tag (optional)</Label>
            <Input value={campaign} placeholder="e.g. june-newsletter" onChange={(e) => setCampaign(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input readOnly value={url} className="font-mono text-xs" />
          <Button variant="outline" className="gap-2 shrink-0" onClick={() => onCopy(url)}>
            <Copy className="h-4 w-4" /> Copy
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" className="gap-2" onClick={() => onShare(url, course?.title ?? "", "whatsapp")}>
            <Share2 className="h-3.5 w-3.5" /> WhatsApp
          </Button>
          <Button size="sm" variant="secondary" className="gap-2" onClick={() => onShare(url, course?.title ?? "", "x")}>
            <Share2 className="h-3.5 w-3.5" /> X
          </Button>
          <Button size="sm" variant="secondary" className="gap-2" onClick={() => onShare(url, course?.title ?? "", "linkedin")}>
            <Linkedin className="h-3.5 w-3.5" /> LinkedIn
          </Button>
          <Button size="sm" variant="ghost" className="gap-2" onClick={downloadQr}>
            <Download className="h-3.5 w-3.5" /> QR code
          </Button>
          {dirty && (
            <Button size="sm" className="gap-2" onClick={() => onSaveLanding(selection.id, path)}>
              Save as default
            </Button>
          )}
        </div>

        <div ref={qrRef} className="hidden">
          <QRCodeCanvas value={url} size={512} includeMargin />
        </div>
      </CardContent>
    </Card>
  );
}
