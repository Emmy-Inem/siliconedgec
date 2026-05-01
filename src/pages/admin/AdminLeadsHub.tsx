import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Inbox, Search, Download, Mail, MessageCircle, GraduationCap,
  ClipboardCheck, Briefcase, Loader2, Filter, Users, AtSign, Copy
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  classifyChannel, CHANNEL_BADGE, DIRECT_EXPLANATION, type Channel,
} from "@/lib/channel-attribution";

type UnifiedLead = {
  id: string;
  source: "registration" | "enrollment" | "business";
  name: string;
  email: string;
  phone?: string | null;
  course_title?: string;
  /** Webinar/event title — only set for source==="registration". */
  webinar_title?: string;
  status?: string;
  meta?: string;
  created_at: string;
  channel: Channel;
};

const SOURCE_META = {
  registration: { label: "Webinar / Event", color: "bg-blue-500/15 text-blue-700 border-blue-500/30", Icon: ClipboardCheck, link: "/admin/registrations" },
  enrollment: { label: "Course Enrollment", color: "bg-green-500/15 text-green-700 border-green-500/30", Icon: GraduationCap, link: "/admin/enrollments" },
  business: { label: "Business Lead", color: "bg-primary/15 text-primary border-primary/30", Icon: Briefcase, link: "/admin/business-leads" },
} as const;

export default function AdminLeadsHub() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [extractorOpen, setExtractorOpen] = useState(false);
  const [includeName, setIncludeName] = useState(false);
  const { toast } = useToast();

  const { data: registrations = [], isLoading: l1 } = useQuery({
    queryKey: ["hub-registrations"],
    queryFn: async () => {
      const { data } = await (supabase.from("course_registrations") as any).select("*").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: enrollments = [], isLoading: l2 } = useQuery({
    queryKey: ["hub-enrollments"],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("id, user_id, course_id, payment_status, created_at, progress_percentage").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: businessLeads = [], isLoading: l3 } = useQuery({
    queryKey: ["hub-business-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("business_leads").select("*").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["hub-courses"],
    queryFn: async () => (await supabase.from("courses").select("id, title")).data ?? [],
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["hub-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("user_id, full_name")).data ?? [],
  });

  // Pull last 90 days of attribution events so we can resolve channel per lead.
  // We match by email (registration/business) or user_id (enrollment).
  const { data: leadSources = [] } = useQuery({
    queryKey: ["hub-lead-sources"],
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * 86400000).toISOString();
      const { data } = await supabase
        .from("lead_sources")
        .select("user_id, utm_source, utm_medium, utm_campaign, referrer, form_data, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      return data ?? [];
    },
    refetchInterval: 60000,
  });

  // Build O(1) lookup maps: email → most-recent attribution, user_id → same.
  const { byEmail, byUser } = useMemo(() => {
    const e = new Map<string, any>();
    const u = new Map<string, any>();
    (leadSources as any[]).forEach((row) => {
      const fd = (row.form_data || {}) as Record<string, any>;
      const em = (fd.email || "").toString().trim().toLowerCase();
      if (em && !e.has(em)) e.set(em, row);
      if (row.user_id && !u.has(row.user_id)) u.set(row.user_id, row);
    });
    return { byEmail: e, byUser: u };
  }, [leadSources]);

  const resolveChannel = (email?: string | null, userId?: string | null): Channel => {
    const em = (email || "").trim().toLowerCase();
    const src = (em && byEmail.get(em)) || (userId && byUser.get(userId)) || null;
    return classifyChannel({
      utm_source: src?.utm_source,
      utm_medium: src?.utm_medium,
      referrer: src?.referrer,
    });
  };

  const courseTitle = (id: string | null | undefined) =>
    id ? (courses.find((c: any) => c.id === id)?.title ?? "Unknown course") : "—";
  const profileName = (id: string | null | undefined) =>
    id ? (profiles.find((p: any) => p.user_id === id)?.full_name ?? "Unknown user") : "Guest";

  const unified: UnifiedLead[] = useMemo(() => {
    const r: UnifiedLead[] = (registrations as any[]).map((x) => ({
      id: `reg-${x.id}`,
      source: "registration",
      name: x.full_name,
      email: x.email,
      phone: x.whatsapp_number,
      webinar_title: courseTitle(x.course_id),
      status: x.status,
      meta: `${x.registration_type} · ${x.country ?? "—"}`,
      created_at: x.created_at,
      channel: resolveChannel(x.email, x.user_id),
    }));
    const e: UnifiedLead[] = (enrollments as any[]).map((x) => ({
      id: `enr-${x.id}`,
      source: "enrollment",
      name: profileName(x.user_id),
      email: "—",
      course_title: courseTitle(x.course_id),
      status: x.payment_status,
      meta: `${Math.round(x.progress_percentage ?? 0)}% complete`,
      created_at: x.created_at,
      channel: resolveChannel(null, x.user_id),
    }));
    const b: UnifiedLead[] = (businessLeads as any[]).map((x) => ({
      id: `biz-${x.id}`,
      source: "business",
      name: x.contact_name,
      email: x.email,
      phone: x.phone,
      course_title: x.company_name,
      status: x.status,
      meta: x.industry ?? "—",
      created_at: x.created_at,
      channel: resolveChannel(x.email, null),
    }));
    return [...r, ...e, ...b].sort((a, z) => +new Date(z.created_at) - +new Date(a.created_at));
  }, [registrations, enrollments, businessLeads, courses, profiles, byEmail, byUser]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const ranges: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    return unified.filter((u) => {
      if (sourceFilter !== "all" && u.source !== sourceFilter) return false;
      if (channelFilter !== "all" && u.channel !== channelFilter) return false;
      if (dateRange !== "all") {
        const days = ranges[dateRange] ?? 0;
        if (now - +new Date(u.created_at) > days * 86400000) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.course_title ?? "").toLowerCase().includes(q) ||
          (u.webinar_title ?? "").toLowerCase().includes(q) ||
          (u.phone ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [unified, sourceFilter, channelFilter, dateRange, search]);

  // Channel breakdown across the unfiltered set so admins always see every
  // platform that brought leads, not just whatever's currently filtered.
  const channelStats = useMemo(() => {
    const map = new Map<Channel, number>();
    unified.forEach((u) => map.set(u.channel, (map.get(u.channel) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [unified]);

  const stats = useMemo(() => ({
    total: unified.length,
    registrations: registrations.length,
    enrollments: enrollments.length,
    business: businessLeads.length,
  }), [unified, registrations, enrollments, businessLeads]);

  const exportCsv = () => {
    const header = ["Source", "Channel", "Name", "Email", "Phone", "Course / Webinar / Company", "Status", "Meta", "Created"];
    const lines = filtered.map((r) => [
      r.source, r.channel, r.name, r.email, r.phone ?? "",
      r.webinar_title ?? r.course_title ?? "",
      r.status ?? "", r.meta ?? "", new Date(r.created_at).toISOString(),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-hub-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group filtered results by date label (Today / Yesterday / This Week / Older)
  const grouped = useMemo(() => {
    const groups: Record<string, UnifiedLead[]> = {};
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = startOfDay - 86400000;
    const weekAgo = startOfDay - 7 * 86400000;
    filtered.forEach((u) => {
      const t = +new Date(u.created_at);
      const label =
        t >= startOfDay ? "Today" :
        t >= yesterday ? "Yesterday" :
        t >= weekAgo ? "Earlier this week" :
        new Date(u.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });
      (groups[label] ||= []).push(u);
    });
    return Object.entries(groups);
  }, [filtered]);

  const isLoading = l1 || l2 || l3;

  const uniqueEmails = useMemo(() => {
    const seen = new Map<string, string>(); // email -> name
    filtered.forEach((u) => {
      const e = (u.email || "").trim().toLowerCase();
      if (!e || e === "—" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
      if (!seen.has(e)) seen.set(e, u.name || "");
    });
    return Array.from(seen.entries()).map(([email, name]) => ({ email, name }));
  }, [filtered]);

  const formattedEmails = useMemo(() => {
    if (includeName) {
      return uniqueEmails.map((u) => (u.name ? `${u.name} <${u.email}>` : u.email)).join(", ");
    }
    return uniqueEmails.map((u) => u.email).join(", ");
  }, [uniqueEmails, includeName]);

  const copyEmails = async () => {
    await navigator.clipboard.writeText(formattedEmails);
    toast({ title: "Copied", description: `${uniqueEmails.length} emails copied to clipboard.` });
  };

  const downloadEmails = () => {
    const blob = new Blob([formattedEmails], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-emails-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openMailto = () => {
    const batchSize = 90;
    const first = uniqueEmails.slice(0, batchSize).map((u) => u.email).join(",");
    window.location.href = `mailto:?bcc=${encodeURIComponent(first)}`;
    if (uniqueEmails.length > batchSize) {
      toast({
        title: "Opened first batch",
        description: `Loaded first ${batchSize} of ${uniqueEmails.length}. Use Copy or Download to get the rest.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Inbox className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Leads &amp; Enrollments Hub</h1>
            <p className="text-sm text-muted-foreground">
              Unified timeline across webinars, paid enrollments, and B2B leads — {stats.total} total
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setExtractorOpen(true)}>
            <AtSign className="h-4 w-4 mr-2" />Extract Emails
          </Button>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "All", value: stats.total, Icon: Users, source: "all" },
          { label: "Webinars", value: stats.registrations, Icon: ClipboardCheck, source: "registration" },
          { label: "Enrollments", value: stats.enrollments, Icon: GraduationCap, source: "enrollment" },
          { label: "B2B", value: stats.business, Icon: Briefcase, source: "business" },
        ].map((c) => (
          <button key={c.source} onClick={() => setSourceFilter(c.source)}
            className={`text-left p-4 rounded-xl border bg-card transition-all ${sourceFilter === c.source ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"}`}>
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
              <c.Icon className="h-3.5 w-3.5" />{c.label}
            </div>
            <p className="font-heading text-2xl font-bold mt-1">{c.value}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, email, phone or course/company..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger><Filter className="h-3.5 w-3.5 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="registration">Webinar registrations</SelectItem>
            <SelectItem value="enrollment">Course enrollments</SelectItem>
            <SelectItem value="business">Business leads</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No leads match your filters.</p>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            {grouped.map(([label, items]) => (
              <div key={label}>
                <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-5 py-2 flex items-center justify-between z-10">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                  <span className="text-[10px] text-muted-foreground/70">{items.length} {items.length === 1 ? "lead" : "leads"}</span>
                </div>
                <div className="divide-y divide-border">
                {items.map((u, i) => {
                  const meta = SOURCE_META[u.source];
                  const Icon = meta.Icon;
                  return (
                <motion.div key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.008, 0.25) }}
                  className="flex items-start gap-4 px-5 py-3.5 hover:bg-muted/30">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.color} border`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{u.name}</span>
                      <Badge variant="outline" className={`text-[10px] ${meta.color} border`}>{meta.label}</Badge>
                      {u.status && <Badge variant="outline" className="text-[10px] capitalize">{u.status}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {u.email !== "—" && <span>{u.email}</span>}
                      {u.phone && <span className="ml-2">· {u.phone}</span>}
                      {u.course_title && <span className="ml-2">· {u.course_title}</span>}
                      {u.meta && <span className="ml-2 italic">· {u.meta}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {u.email && u.email !== "—" && (
                      <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Email">
                        <a href={`mailto:${u.email}`}><Mail className="h-3.5 w-3.5" /></a>
                      </Button>
                    )}
                    {u.phone && (
                      <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="WhatsApp">
                        <a href={`https://wa.me/${u.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                          <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                        </a>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                      <Link to={meta.link}>Open</Link>
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 shrink-0 self-center">
                    {new Date(u.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </motion.div>
                  );
                })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={extractorOpen} onOpenChange={setExtractorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <AtSign className="h-5 w-5 text-primary" /> Email Extractor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">{uniqueEmails.length}</span> unique emails of {filtered.length} leads
              </p>
              <div className="flex items-center gap-2">
                <Switch id="include-name" checked={includeName} onCheckedChange={setIncludeName} />
                <Label htmlFor="include-name" className="text-xs cursor-pointer">Include name</Label>
              </div>
            </div>
            <Textarea value={formattedEmails} readOnly rows={10} className="font-mono text-xs" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={copyEmails} disabled={uniqueEmails.length === 0}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
              </Button>
              <Button size="sm" variant="outline" onClick={downloadEmails} disabled={uniqueEmails.length === 0}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download .txt
              </Button>
              <Button size="sm" variant="outline" onClick={openMailto} disabled={uniqueEmails.length === 0}>
                <Mail className="h-3.5 w-3.5 mr-1.5" /> Open in mail client
              </Button>
            </div>
            {uniqueEmails.length > 90 && (
              <p className="text-[11px] text-muted-foreground">
                Note: mailto links auto-chunk to 90 addresses per batch (browser URL limit). Use Copy or Download for larger lists.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
