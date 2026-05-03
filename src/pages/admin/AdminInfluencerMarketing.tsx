import { useState, forwardRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Copy, Trash2, TrendingUp, Users, DollarSign, Ticket,
  Loader2, RefreshCw, BarChart3, Eye, Link2, ExternalLink, AlertCircle, CheckCircle2, MousePointerClick
} from "lucide-react";
import { format } from "date-fns";

// Canonical public URL — always use the published domain for shareable
// influencer/UTM links so testers don't hit the preview-domain auth gate.
const PUBLIC_SITE_URL = "https://siliconedgec.com";

function generateCode(prefix = "PROMO") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = prefix + "-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Validate a custom landing path: must start with /, no protocol, no spaces, reasonable length
function validatePath(path: string): { ok: boolean; reason?: string } {
  if (!path) return { ok: false, reason: "Path is required" };
  if (/^https?:\/\//i.test(path)) return { ok: false, reason: "Use a relative path, not a full URL" };
  if (!path.startsWith("/")) return { ok: false, reason: "Must start with /" };
  if (/\s/.test(path)) return { ok: false, reason: "Cannot contain spaces" };
  if (path.length > 200) return { ok: false, reason: "Too long (max 200 chars)" };
  if (!/^\/[a-zA-Z0-9\-_/.?=&%#]*$/.test(path)) return { ok: false, reason: "Contains invalid characters" };
  return { ok: true };
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
}

function buildUtmUrl(origin: string, path: string, utm: { source?: string; medium?: string; campaign?: string; content?: string; term?: string }) {
  const url = new URL(path, origin);
  if (utm.source) url.searchParams.set("utm_source", slugify(utm.source));
  if (utm.medium) url.searchParams.set("utm_medium", slugify(utm.medium));
  if (utm.campaign) url.searchParams.set("utm_campaign", slugify(utm.campaign));
  if (utm.content) url.searchParams.set("utm_content", slugify(utm.content));
  if (utm.term) url.searchParams.set("utm_term", slugify(utm.term));
  return url.toString();
}

export default function AdminInfluencerMarketing() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailCode, setDetailCode] = useState<any>(null);

  // Form state
  const [form, setForm] = useState({
    code: generateCode(),
    influencer_name: "",
    influencer_email: "",
    slug: "",
    discount_type: "percentage",
    discount_value: "10",
    commission_percentage: "10",
    max_uses: "",
    expires_at: "",
    landing_target: "courses", // courses | home | course | custom
    landing_course_id: "",
    landing_path: "",
    utm_source: "",
    utm_medium: "influencer",
    utm_campaign: "",
    utm_content: "",
  });

  const resetForm = () => setForm({
    code: generateCode(),
    influencer_name: "",
    influencer_email: "",
    slug: "",
    discount_type: "percentage",
    discount_value: "10",
    commission_percentage: "10",
    max_uses: "",
    expires_at: "",
    landing_target: "courses",
    landing_course_id: "",
    landing_path: "",
    utm_source: "",
    utm_medium: "influencer",
    utm_campaign: "",
    utm_content: "",
  });

  // Queries
  const { data: promoCodes = [], isLoading } = useQuery({
    queryKey: ["admin-promo-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("influencer_referrals")
        .select("*, promo_codes(code, influencer_name), courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: courseList = [] } = useQuery({
    queryKey: ["admin-promo-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").eq("is_published", true).order("title");
      return data ?? [];
    },
  });

  // Per-promo click counts (page visits with matching utm_campaign or utm_source=slug)
  const { data: clickCounts = {} } = useQuery({
    queryKey: ["admin-promo-click-counts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("influencer_click_counts");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { map[r.promo_code_id] = Number(r.clicks ?? 0); });
      return map;
    },
  });
  const totalClicks = Object.values(clickCounts).reduce((s: number, n: number) => s + n, 0);

  const computeLandingPath = (f: typeof form): string => {
    if (f.landing_target === "home") return "/";
    if (f.landing_target === "courses") return "/courses";
    if (f.landing_target === "course" && f.landing_course_id) return `/courses/${f.landing_course_id}`;
    if (f.landing_target === "custom" && f.landing_path) {
      return f.landing_path.startsWith("/") ? f.landing_path : `/${f.landing_path}`;
    }
    return "/courses";
  };

  // Stats
  const totalRevenue = promoCodes.reduce((s: number, p: any) => s + Number(p.revenue_generated || 0), 0);
  const totalUses = promoCodes.reduce((s: number, p: any) => s + (p.usage_count || 0), 0);
  const activeCount = promoCodes.filter((p: any) => p.is_active).length;
  const totalCommission = referrals.reduce((s: number, r: any) => s + Number(r.commission_earned || 0), 0);
  const webinarRegs = referrals.filter((r: any) => r.conversion_type === "webinar_registration").length;
  const paidConvs = referrals.filter((r: any) => r.conversion_type === "paid_enrollment").length;

  // Mutations
  const createPromo = useMutation({
    mutationFn: async () => {
      const slug = (form.slug || form.influencer_name).toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      const { error } = await (supabase.from("promo_codes") as any).insert({
        code: form.code.toUpperCase(),
        influencer_name: form.influencer_name,
        influencer_email: form.influencer_email || null,
        slug: slug || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        commission_percentage: Number(form.commission_percentage),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
        landing_path: computeLandingPath(form),
        utm_source: form.utm_source || null,
        utm_medium: form.utm_medium || null,
        utm_campaign: form.utm_campaign || null,
        utm_content: form.utm_content || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
      toast({ title: "Promo code created!" });
      setCreateOpen(false);
      resetForm();
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("promo_codes").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-promo-codes"] }),
  });

  const deletePromo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
      toast({ title: "Promo code deleted" });
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: `${code} copied to clipboard.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Influencer Marketing</h1>
          <p className="text-sm text-muted-foreground">Manage promo codes, track referrals, and monitor influencer performance.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Create Promo Code</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
            <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
              <DialogTitle className="font-heading">Create Promo Code</DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Promo Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "") })}
                      placeholder="WELCOME10 or any custom code"
                      maxLength={40}
                    />
                    <Button size="icon" variant="outline" onClick={() => setForm({ ...form, code: generateCode() })} title="Generate random code">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Type any custom code (e.g. <span className="font-mono">SUMMER25</span>) or click <RefreshCw className="inline h-2.5 w-2.5" /> for a random one.</p>
                </div>
                <div className="space-y-2">
                  <Label>Influencer Name</Label>
                  <Input value={form.influencer_name} onChange={(e) => setForm({ ...form, influencer_name: e.target.value })} placeholder="Jane Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Influencer Email</Label>
                <Input type="email" value={form.influencer_email} onChange={(e) => setForm({ ...form, influencer_email: e.target.value })} placeholder="jane@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Custom Short Slug (optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">/r/</span>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder={form.influencer_name.toLowerCase().replace(/\s+/g, "-") || "tayo"}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Lowercase letters, numbers, hyphens. Defaults to influencer name.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Commission %</Label>
                  <Input type="number" value={form.commission_percentage} onChange={(e) => setForm({ ...form, commission_percentage: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Max Uses (optional)</Label>
                  <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Unlimited" />
                </div>
                <div className="space-y-2">
                  <Label>Expires At (optional)</Label>
                  <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2 border-t border-border pt-4">
                <Label className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Link Destination</Label>
                <Select value={form.landing_target} onValueChange={(v) => setForm({ ...form, landing_target: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="courses">Courses Catalog (/courses)</SelectItem>
                    <SelectItem value="home">Home Page (/)</SelectItem>
                    <SelectItem value="course">Specific Course</SelectItem>
                    <SelectItem value="custom">Custom Page Path</SelectItem>
                  </SelectContent>
                </Select>
                {form.landing_target === "course" && (
                  <Select value={form.landing_course_id} onValueChange={(v) => setForm({ ...form, landing_course_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick a course..." /></SelectTrigger>
                    <SelectContent>
                      {courseList.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {form.landing_target === "custom" && (
                  <>
                    <Input
                      value={form.landing_path}
                      onChange={(e) => setForm({ ...form, landing_path: e.target.value })}
                      placeholder="/pricing or /for-businesses"
                    />
                    {form.landing_path && (() => {
                      const v = validatePath(form.landing_path);
                      return v.ok ? (
                        <p className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Valid path</p>
                      ) : (
                        <p className="text-[10px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {v.reason}</p>
                      );
                    })()}
                  </>
                )}

                {/* UTM Editor */}
                <div className="mt-3 pt-3 border-t border-dashed border-border space-y-2">
                  <Label className="text-xs">UTM Parameters (auto-injected)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="utm_source (e.g. tayo)"
                      value={form.utm_source}
                      onChange={(e) => setForm({ ...form, utm_source: e.target.value })}
                    />
                    <Input
                      placeholder="utm_medium (influencer)"
                      value={form.utm_medium}
                      onChange={(e) => setForm({ ...form, utm_medium: e.target.value })}
                    />
                    <Input
                      placeholder="utm_campaign (promo code)"
                      value={form.utm_campaign}
                      onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })}
                    />
                    <Input
                      placeholder="utm_content (optional)"
                      value={form.utm_content}
                      onChange={(e) => setForm({ ...form, utm_content: e.target.value })}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Leave blank to use defaults: source = influencer name, medium = influencer, campaign = promo code.
                  </p>
                </div>

                {/* Live Preview */}
                {(() => {
                  const path = computeLandingPath(form);
                  const utm = {
                    source: form.utm_source || form.influencer_name,
                    medium: form.utm_medium || "influencer",
                    campaign: form.utm_campaign || form.code,
                    content: form.utm_content,
                  };
                  const fullUrl = (form.utm_source || form.utm_campaign || form.utm_content)
                    ? buildUtmUrl(PUBLIC_SITE_URL, path, utm)
                    : `${PUBLIC_SITE_URL}${path}`;
                  return (
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-2.5 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                        <Eye className="h-3 w-3" /> Live Preview
                      </p>
                      <p className="text-[10px] text-muted-foreground">Short link:</p>
                      <p className="font-mono text-xs break-all text-primary">{`${PUBLIC_SITE_URL}/r/${form.slug || slugify(form.influencer_name) || "your-slug"}`}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Resolves to:</p>
                      <p className="font-mono text-[11px] break-all text-foreground">{fullUrl}</p>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="px-6 py-3 border-t border-border bg-background shrink-0 flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                {!form.influencer_name && "Influencer name is required"}
                {form.landing_target === "custom" && !validatePath(form.landing_path).ok && form.landing_path && " · Fix the path"}
                {form.landing_target === "course" && !form.landing_course_id && " · Pick a course"}
              </p>
              <Button
                onClick={() => createPromo.mutate()}
                disabled={
                  !form.code ||
                  !form.influencer_name ||
                  createPromo.isPending ||
                  (form.landing_target === "custom" && !validatePath(form.landing_path).ok) ||
                  (form.landing_target === "course" && !form.landing_course_id)
                }
              >
                {createPromo.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Promo Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard icon={Ticket} label="Active Codes" value={activeCount} />
        <StatCard icon={MousePointerClick} label="Link Clicks" value={totalClicks} />
        <StatCard icon={Users} label="Webinar Regs" value={webinarRegs} />
        <StatCard icon={Users} label="Paid Conversions" value={paidConvs} />
        <StatCard icon={DollarSign} label="Revenue Generated" value={`₦${totalRevenue.toLocaleString()}`} />
        <StatCard icon={TrendingUp} label="Commission Owed" value={`₦${totalCommission.toLocaleString()}`} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="codes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="codes" className="gap-1.5"><Ticket className="h-3.5 w-3.5" /> Promo Codes</TabsTrigger>
          <TabsTrigger value="referrals" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Referral Log</TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Leaderboard</TabsTrigger>
        </TabsList>

        {/* Promo Codes Tab */}
        <TabsContent value="codes">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : promoCodes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No promo codes yet. Create your first one above.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Influencer</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead className="text-center">Clicks</TableHead>
                      <TableHead className="text-center">Webinar</TableHead>
                      <TableHead className="text-center">Paid</TableHead>
                      <TableHead className="text-center">Uses</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoCodes.map((pc: any) => {
                      const expired = pc.expires_at && new Date(pc.expires_at) < new Date();
                      const maxed = pc.max_uses && pc.usage_count >= pc.max_uses;
                      const rs = referrals.filter((r: any) => r.promo_code_id === pc.id);
                      const wCount = rs.filter((r: any) => r.conversion_type === "webinar_registration").length;
                      const pCount = rs.filter((r: any) => r.conversion_type === "paid_enrollment").length;
                      const clicks = clickCounts[pc.id] ?? 0;
                      return (
                        <TableRow key={pc.id}>
                          <TableCell>
                            <button onClick={() => copyCode(pc.code)} className="flex items-center gap-1.5 font-mono font-semibold text-primary hover:underline">
                              {pc.code} <Copy className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{pc.influencer_name}</p>
                              {pc.influencer_email && <p className="text-xs text-muted-foreground">{pc.influencer_email}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {pc.discount_type === "percentage" ? `${pc.discount_value}%` : `$${pc.discount_value}`}
                          </TableCell>
                          <TableCell>{pc.commission_percentage}%</TableCell>
                          <TableCell className="text-center font-medium">{clicks}</TableCell>
                          <TableCell className="text-center">{wCount}</TableCell>
                          <TableCell className="text-center">{pCount}</TableCell>
                          <TableCell className="text-center">
                            {pc.usage_count}{pc.max_uses ? `/${pc.max_uses}` : ""}
                          </TableCell>
                          <TableCell className="font-medium">₦{Number(pc.revenue_generated).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={pc.is_active && !expired && !maxed}
                                disabled={!!expired || !!maxed}
                                onCheckedChange={(v) => toggleActive.mutate({ id: pc.id, is_active: v })}
                              />
                              {expired ? (
                                <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                              ) : maxed ? (
                                <Badge variant="secondary" className="text-[10px]">Maxed</Badge>
                              ) : pc.is_active ? (
                                <Badge className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setDetailCode(pc)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deletePromo.mutate(pc.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referral Log Tab */}
        <TabsContent value="referrals">
          <Card>
            <CardContent className="p-0">
              {referrals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No referrals tracked yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Promo Code</TableHead>
                      <TableHead>Influencer</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Original</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              r.conversion_type === "paid_enrollment"
                                ? "text-[10px] bg-green-100 text-green-700 border-green-200"
                                : r.conversion_type === "webinar_registration"
                                ? "text-[10px] bg-blue-100 text-blue-700 border-blue-200"
                                : "text-[10px]"
                            }
                          >
                            {r.conversion_type === "paid_enrollment"
                              ? "Paid"
                              : r.conversion_type === "webinar_registration"
                              ? "Webinar"
                              : "Free"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-primary text-sm">
                          {r.promo_codes?.code ?? <span className="text-muted-foreground">UTM only</span>}
                        </TableCell>
                        <TableCell className="text-sm">{r.promo_codes?.influencer_name ?? r.utm_source ?? "—"}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{r.courses?.title}</TableCell>
                        <TableCell className="text-sm">₦{Number(r.original_price).toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-destructive">-₦{Number(r.discount_applied).toFixed(2)}</TableCell>
                        <TableCell className="text-sm font-medium">₦{Number(r.final_price).toFixed(2)}</TableCell>
                        <TableCell className="text-sm font-medium text-primary">₦{Number(r.commission_earned).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Top Influencers by Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              {promoCodes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data yet.</p>
              ) : (
                <div className="space-y-3">
                  {[...promoCodes]
                    .map((pc: any) => {
                      const rs = referrals.filter((r: any) => r.promo_code_id === pc.id);
                      return {
                        ...pc,
                        webinar_count: rs.filter((r: any) => r.conversion_type === "webinar_registration").length,
                        paid_count: rs.filter((r: any) => r.conversion_type === "paid_enrollment").length,
                        commission_total: rs.reduce((s: number, r: any) => s + Number(r.commission_earned || 0), 0),
                        clicks: clickCounts[pc.id] ?? 0,
                      };
                    })
                    .sort((a: any, b: any) =>
                      Number(b.revenue_generated) - Number(a.revenue_generated) ||
                      (b.paid_count + b.webinar_count) - (a.paid_count + a.webinar_count) ||
                      b.clicks - a.clicks
                    )
                    .slice(0, 10)
                    .map((pc: any, i: number) => (
                      <div key={pc.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading font-bold text-sm">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{pc.influencer_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{pc.code}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-heading font-bold text-sm">₦{Number(pc.revenue_generated).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {pc.clicks} clicks · {pc.webinar_count} webinar · {pc.paid_count} paid
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!detailCode} onOpenChange={(v) => !v && setDetailCode(null)}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="font-heading">Promo Code Details</DialogTitle>
            <DialogDescription className="sr-only">
              View influencer promo code, short link, and UTM tracking link.
            </DialogDescription>
          </DialogHeader>
          {detailCode && (
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="font-mono text-2xl font-bold text-primary">{detailCode.code}</p>
                <p className="text-sm text-muted-foreground mt-1">by {detailCode.influencer_name}</p>
              </div>

              {/* Short Influencer Link (primary) */}
              {detailCode.slug && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Link2 className="h-3 w-3" /> Short Link (recommended)</p>
                  <div className="bg-primary/5 border border-primary/30 rounded-md p-2.5">
                    <p className="font-mono text-sm break-all text-primary font-semibold select-all">
                      {`${PUBLIC_SITE_URL}/r/${detailCode.slug}`}
                    </p>
                    {detailCode.landing_path && (
                      <p className="font-mono text-[10px] text-muted-foreground mt-1">
                        → lands on <span className="text-foreground">{detailCode.landing_path}</span>
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="w-full gap-2 text-xs"
                    onClick={() => {
                      const url = `${PUBLIC_SITE_URL}/r/${detailCode.slug}`;
                      navigator.clipboard.writeText(url);
                      toast({ title: "Short link copied!", description: "Auto-applies promo + tracks attribution." });
                    }}
                  >
                    <Copy className="h-3 w-3" /> Copy Short Link
                  </Button>
                </div>
              )}

              {/* UTM Tracking Link */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Link2 className="h-3 w-3" /> Custom UTM Link (full URL)</p>
                {(() => {
                  const path = detailCode.landing_path || "/courses";
                  const utmUrl = buildUtmUrl(PUBLIC_SITE_URL, path, {
                    source: detailCode.influencer_name,
                    medium: "influencer",
                    campaign: detailCode.code,
                    content: "promo",
                  });
                  return (
                    <>
                      <div className="bg-background rounded-md border border-border p-2.5">
                        <p className="font-mono text-xs break-all text-foreground select-all">{utmUrl}</p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-1">Destination: <span className="text-foreground">{path}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-2 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(utmUrl);
                            toast({ title: "UTM link copied!", description: "Share this link for tracked referrals." });
                          }}
                        >
                          <Copy className="h-3 w-3" /> Copy UTM Link
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 text-xs"
                          onClick={() => window.open(utmUrl, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3" /> Preview
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailRow label="Discount" value={detailCode.discount_type === "percentage" ? `${detailCode.discount_value}%` : `$${detailCode.discount_value}`} />
                <DetailRow label="Commission" value={`${detailCode.commission_percentage}%`} />
                <DetailRow label="Uses" value={`${detailCode.usage_count}${detailCode.max_uses ? ` / ${detailCode.max_uses}` : ""}`} />
                <DetailRow label="Revenue" value={`₦${Number(detailCode.revenue_generated).toLocaleString()}`} />
                <DetailRow label="Created" value={format(new Date(detailCode.created_at), "MMM d, yyyy")} />
                <DetailRow label="Expires" value={detailCode.expires_at ? format(new Date(detailCode.expires_at), "MMM d, yyyy") : "Never"} />
              </div>
              {detailCode.influencer_email && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Email: </span>
                  <a href={`mailto:${detailCode.influencer_email}`} className="text-primary hover:underline">{detailCode.influencer_email}</a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-heading text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const DetailRow = forwardRef<HTMLDivElement, { label: string; value: string }>(
  ({ label, value }, ref) => (
    <div ref={ref} className="bg-background rounded-md p-2.5 border border-border">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  ),
);
DetailRow.displayName = "DetailRow";
