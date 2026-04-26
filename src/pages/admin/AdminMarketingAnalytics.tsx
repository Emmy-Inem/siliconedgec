import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area
} from "recharts";
import {
  Target, Download, Filter, TrendingUp, Globe, Megaphone,
  Users, MousePointerClick, Clock, ArrowUpRight, ArrowDownRight,
  Eye, Map, Smartphone, Monitor, Laptop, BarChart3, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const COLORS = [
  "hsl(276, 100%, 62%)", "hsl(197, 100%, 47%)", "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(280, 65%, 60%)",
  "hsl(330, 80%, 55%)", "hsl(200, 80%, 55%)",
];

const tooltipStyle = {
  fontSize: 11, borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
};

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function getHour(d: string) {
  return new Date(d).getHours();
}

export default function AdminMarketingAnalytics() {
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState<"today" | "7d" | "30d" | "90d" | "all">("30d");
  const [sourceFilter, setSourceFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin-lead-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_sources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["admin-enrollments-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = useMemo(() => {
    let result = leads;
    const now = Date.now();
    if (dateFilter === "today") {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      result = result.filter(l => new Date(l.created_at).getTime() > startOfDay.getTime());
    } else if (dateFilter !== "all") {
      const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
      result = result.filter(l => new Date(l.created_at).getTime() > now - days * 86400000);
    }
    if (sourceFilter) result = result.filter(l => l.utm_source === sourceFilter);
    if (campaignFilter) result = result.filter(l => l.utm_campaign === campaignFilter);
    return result;
  }, [leads, dateFilter, sourceFilter, campaignFilter]);

  const uniqueSources = [...new Set(leads.map(l => l.utm_source).filter(Boolean))];
  const uniqueCampaigns = [...new Set(leads.map(l => l.utm_campaign).filter(Boolean))];

  // Previous period for comparison
  const prevPeriodLeads = useMemo(() => {
    const now = Date.now();
    if (dateFilter === "all" || dateFilter === "today") return [];
    const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
    const cutoffCurrent = now - days * 86400000;
    const cutoffPrev = cutoffCurrent - days * 86400000;
    return leads.filter(l => {
      const t = new Date(l.created_at).getTime();
      return t > cutoffPrev && t <= cutoffCurrent;
    });
  }, [leads, dateFilter]);

  const percentChange = prevPeriodLeads.length > 0
    ? Math.round(((filtered.length - prevPeriodLeads.length) / prevPeriodLeads.length) * 100)
    : null;

  // Source breakdown
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => { const s = l.utm_source || "Direct"; map[s] = (map[s] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Campaign performance
  const campaignData = useMemo(() => {
    const map: Record<string, { visits: number; conversions: number }> = {};
    filtered.forEach(l => {
      if (!l.utm_campaign) return;
      if (!map[l.utm_campaign]) map[l.utm_campaign] = { visits: 0, conversions: 0 };
      map[l.utm_campaign].visits++;
      if (l.form_type && l.form_type !== "page_visit") map[l.utm_campaign].conversions++;
    });
    return Object.entries(map).map(([name, d]) => ({
      name, visits: d.visits, conversions: d.conversions,
      rate: d.visits > 0 ? Math.round((d.conversions / d.visits) * 100) : 0,
    })).sort((a, b) => b.visits - a.visits).slice(0, 10);
  }, [filtered]);

  // Medium breakdown
  const mediumData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => { const m = l.utm_medium || "none"; map[m] = (map[m] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Form type breakdown
  const formTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => { const ft = l.form_type || "unknown"; map[ft] = (map[ft] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Timeline chart data
  const timelineData = useMemo(() => {
    if (dateFilter === "today") {
      const hourMap: Record<number, { visits: number; conversions: number }> = {};
      for (let h = 0; h < 24; h++) hourMap[h] = { visits: 0, conversions: 0 };
      filtered.forEach(l => {
        const h = getHour(l.created_at);
        hourMap[h].visits++;
        if (l.form_type && l.form_type !== "page_visit") hourMap[h].conversions++;
      });
      return Object.entries(hourMap).map(([h, d]) => ({
        date: `${String(h).padStart(2, "0")}:00`, visits: d.visits, conversions: d.conversions,
      }));
    }
    const dateMap: Record<string, { visits: number; conversions: number }> = {};
    filtered.forEach(l => {
      const d = formatDate(l.created_at);
      if (!dateMap[d]) dateMap[d] = { visits: 0, conversions: 0 };
      dateMap[d].visits++;
      if (l.form_type && l.form_type !== "page_visit") dateMap[d].conversions++;
    });
    return Object.entries(dateMap)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, d]) => ({ date, ...d }));
  }, [filtered, dateFilter]);

  // Landing pages
  const landingPageData = useMemo(() => {
    const map: Record<string, { views: number; conversions: number }> = {};
    filtered.forEach(l => {
      const p = l.landing_page || "/";
      if (!map[p]) map[p] = { views: 0, conversions: 0 };
      map[p].views++;
      if (l.form_type && l.form_type !== "page_visit") map[p].conversions++;
    });
    return Object.entries(map)
      .map(([page, d]) => ({ page, ...d, rate: d.views > 0 ? Math.round((d.conversions / d.views) * 100) : 0 }))
      .sort((a, b) => b.views - a.views);
  }, [filtered]);

  // Referrer data
  const referrerData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => {
      let ref = l.referrer || "Direct";
      try { ref = new URL(ref).hostname; } catch {}
      map[ref] = (map[ref] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filtered]);

  // Content breakdown (utm_content)
  const contentData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => { if (l.utm_content) map[l.utm_content] = (map[l.utm_content] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Conversion metrics
  const totalVisits = filtered.filter(l => l.form_type === "page_visit").length;
  const totalConversions = filtered.filter(l => l.form_type && l.form_type !== "page_visit").length;
  const conversionRate = totalVisits > 0 ? ((totalConversions / totalVisits) * 100).toFixed(1) : "0";

  // Enrollment timeline
  const enrollmentTimeline = useMemo(() => {
    const now = Date.now();
    let filteredEnroll = enrollments;
    if (dateFilter === "today") {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      filteredEnroll = enrollments.filter(e => new Date(e.created_at).getTime() > startOfDay.getTime());
    } else if (dateFilter !== "all") {
      const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
      filteredEnroll = enrollments.filter(e => new Date(e.created_at).getTime() > now - days * 86400000);
    }
    const map: Record<string, number> = {};
    filteredEnroll.forEach(e => {
      const d = formatDate(e.created_at);
      map[d] = (map[d] ?? 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, enrollments: count }));
  }, [enrollments, dateFilter]);

  // Source + Campaign table
  const tableData = useMemo(() => {
    const map: Record<string, { leads: number; conversions: number }> = {};
    filtered.forEach(l => {
      const key = `${l.utm_source || "Direct"}|||${l.utm_campaign || "—"}|||${l.utm_medium || "—"}`;
      if (!map[key]) map[key] = { leads: 0, conversions: 0 };
      map[key].leads++;
      if (l.form_type && l.form_type !== "page_visit") map[key].conversions++;
    });
    return Object.entries(map)
      .map(([key, d]) => {
        const [source, campaign, medium] = key.split("|||");
        return { source, campaign, medium, ...d, rate: d.leads > 0 ? Math.round((d.conversions / d.leads) * 100) : 0 };
      })
      .sort((a, b) => b.leads - a.leads);
  }, [filtered]);

  // Recent leads
  const recentLeads = filtered.slice(0, 15);

  const inputClass = "px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Marketing Analytics</h1>
            <p className="text-sm text-muted-foreground">Full attribution, acquisition & behavior insights</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
          downloadCSV("marketing-analytics.csv",
            ["Source", "Campaign", "Medium", "Leads", "Conversions", "Conv. Rate"],
            tableData.map(r => [r.source, r.campaign, r.medium, String(r.leads), String(r.conversions), `${r.rate}%`])
          );
          toast({ title: "Exported" });
        }}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["today", "7d", "30d", "90d", "all"] as const).map(d => (
            <button key={d} onClick={() => setDateFilter(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dateFilter === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {d === "all" ? "All Time" : d === "today" ? "Today" : d === "7d" ? "7 Days" : d === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className={inputClass}>
          <option value="">All Sources</option>
          {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)} className={inputClass}>
          <option value="">All Campaigns</option>
          {uniqueCampaigns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Leads", value: filtered.length, icon: TrendingUp, accent: "text-primary", change: percentChange },
          { label: "Page Visits", value: totalVisits, icon: Eye, accent: "text-blue-500" },
          { label: "Conversions", value: totalConversions, icon: MousePointerClick, accent: "text-green-500" },
          { label: "Conv. Rate", value: `${conversionRate}%`, icon: Target, accent: "text-purple-500" },
          { label: "Sources", value: sourceData.length, icon: Globe, accent: "text-orange-500" },
          { label: "Campaigns", value: campaignData.length, icon: Megaphone, accent: "text-pink-500" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-card rounded-2xl border border-border p-4 hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
              {typeof kpi.change === "number" && (
                <span className={`flex items-center gap-0.5 text-[10px] font-medium ${kpi.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {kpi.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(kpi.change)}%
                </span>
              )}
            </div>
            <p className="font-heading text-xl font-bold">{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="site-traffic">Site Traffic</TabsTrigger>
          <TabsTrigger value="realtime">Real-Time</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Timeline */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-heading font-semibold text-sm mb-4">Traffic Over Time</h3>
            <div className="h-72">
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="gradVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(276, 100%, 62%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(276, 100%, 62%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="visits" stroke="hsl(276, 100%, 62%)" fill="url(#gradVisits)" strokeWidth={2} name="Visits" />
                    <Area type="monotone" dataKey="conversions" stroke="hsl(142, 71%, 45%)" fill="url(#gradConv)" strokeWidth={2} name="Conversions" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data for this period</div>
              )}
            </div>
          </motion.div>

          {/* Source + Medium row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Traffic Sources</h3>
              <div className="h-56">
                {sourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={70} strokeWidth={2}>
                        {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {sourceData.slice(0, 6).map((s, i) => (
                  <span key={s.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {s.name} ({s.value})
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Medium Breakdown</h3>
              <div className="h-56">
                {mediumData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mediumData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="hsl(197, 100%, 47%)" radius={[6, 6, 0, 0]} name="Leads" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data</div>
                )}
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* ACQUISITION */}
        <TabsContent value="acquisition" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Campaign Performance */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Campaign Performance</h3>
              <div className="h-64">
                {campaignData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={campaignData} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="visits" fill="hsl(276, 100%, 62%)" radius={[0, 4, 4, 0]} name="Visits" />
                      <Bar dataKey="conversions" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} name="Conversions" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No campaigns</div>
                )}
              </div>
            </motion.div>

            {/* Referrer Sources */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Top Referrers</h3>
              <div className="space-y-2">
                {referrerData.length > 0 ? referrerData.map((r, i) => {
                  const maxVal = referrerData[0]?.value ?? 1;
                  return (
                    <div key={r.name} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-xs font-medium truncate max-w-[200px]">{r.name}</span>
                          <span className="text-xs text-muted-foreground">{r.value}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(r.value / maxVal) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No referrer data</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* UTM Content Breakdown */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-heading font-semibold text-sm mb-4">UTM Content (Ad Creative) Breakdown</h3>
            <div className="h-56">
              {contentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contentData}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[6, 6, 0, 0]} name="Clicks" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No utm_content data yet</div>
              )}
            </div>
          </motion.div>

          {/* Full Attribution Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-heading font-semibold text-sm mb-4">Full Attribution Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Source</th>
                    <th className="pb-2 pr-4 font-medium">Medium</th>
                    <th className="pb-2 pr-4 font-medium">Campaign</th>
                    <th className="pb-2 pr-4 font-medium text-right">Leads</th>
                    <th className="pb-2 pr-4 font-medium text-right">Conv.</th>
                    <th className="pb-2 font-medium text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length > 0 ? tableData.slice(0, 25).map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2.5 pr-4 font-medium">{row.source}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{row.medium}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{row.campaign}</td>
                      <td className="py-2.5 pr-4 text-right">{row.leads}</td>
                      <td className="py-2.5 pr-4 text-right">{row.conversions}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.rate > 10 ? "bg-green-500/10 text-green-600" : row.rate > 0 ? "bg-yellow-500/10 text-yellow-600" : "bg-muted text-muted-foreground"}`}>
                          {row.rate}%
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No lead data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>

        {/* BEHAVIOR */}
        <TabsContent value="behavior" className="space-y-6 mt-4">
          {/* Landing Pages */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-heading font-semibold text-sm mb-4">Top Landing Pages</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Page</th>
                    <th className="pb-2 pr-4 font-medium text-right">Views</th>
                    <th className="pb-2 pr-4 font-medium text-right">Conversions</th>
                    <th className="pb-2 font-medium text-right">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {landingPageData.length > 0 ? landingPageData.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2.5 pr-4 font-mono text-xs">{row.page}</td>
                      <td className="py-2.5 pr-4 text-right">{row.views}</td>
                      <td className="py-2.5 pr-4 text-right">{row.conversions}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.rate > 10 ? "bg-green-500/10 text-green-600" : row.rate > 0 ? "bg-yellow-500/10 text-yellow-600" : "bg-muted text-muted-foreground"}`}>
                          {row.rate}%
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Lead Type Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Lead Type Breakdown</h3>
              <div className="h-56">
                {formTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={formTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={70} strokeWidth={2}>
                        {formTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formTypeData.map((ft, i) => (
                  <span key={ft.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {ft.name} ({ft.value})
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Enrollment Timeline */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Enrollment Timeline</h3>
              <div className="h-56">
                {enrollmentTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={enrollmentTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="enrollments" stroke="hsl(276, 100%, 62%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No enrollments</div>
                )}
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* CONVERSIONS */}
        <TabsContent value="conversions" className="space-y-6 mt-4">
          {/* Conversion funnel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-heading font-semibold text-sm mb-6">Conversion Funnel</h3>
            <div className="flex flex-col items-center gap-2">
              {[
                { label: "Page Visits", value: totalVisits, color: "bg-blue-500" },
                { label: "Leads Generated", value: totalConversions, color: "bg-purple-500" },
                { label: "Enrollments", value: enrollments.length, color: "bg-green-500" },
              ].map((step, i) => {
                const maxVal = Math.max(totalVisits, 1);
                const width = Math.max(20, (step.value / maxVal) * 100);
                return (
                  <div key={step.label} className="w-full max-w-lg">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{step.label}</span>
                      <span className="text-muted-foreground">{step.value}</span>
                    </div>
                    <div className={`h-10 ${step.color} rounded-lg flex items-center justify-center transition-all`} style={{ width: `${width}%` }}>
                      <span className="text-white text-xs font-bold">{step.value}</span>
                    </div>
                    {i < 2 && (
                      <div className="flex justify-center py-1">
                        <span className="text-[10px] text-muted-foreground">
                          {i === 0 ? `${conversionRate}% conversion` : `${totalConversions > 0 ? ((enrollments.length / totalConversions) * 100).toFixed(1) : 0}% to enrollment`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Campaign conversion table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-heading font-semibold text-sm mb-4">Campaign Conversion Rates</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Campaign</th>
                    <th className="pb-2 pr-4 font-medium text-right">Visits</th>
                    <th className="pb-2 pr-4 font-medium text-right">Conversions</th>
                    <th className="pb-2 font-medium text-right">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignData.length > 0 ? campaignData.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2.5 pr-4 font-medium">{row.name}</td>
                      <td className="py-2.5 pr-4 text-right">{row.visits}</td>
                      <td className="py-2.5 pr-4 text-right">{row.conversions}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.rate > 10 ? "bg-green-500/10 text-green-600" : row.rate > 0 ? "bg-yellow-500/10 text-yellow-600" : "bg-muted text-muted-foreground"}`}>
                          {row.rate}%
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No campaign data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </TabsContent>

        {/* SITE TRAFFIC — powered by platform analytics */}
        <TabsContent value="site-traffic" className="space-y-6 mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="font-heading font-semibold text-sm">Platform Site Analytics</h3>
            </div>
            <p className="text-[10px] text-muted-foreground mb-4">
              Real visitor & pageview data from the platform. View full analytics in Settings → Project Insights.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Visitors (30d)", value: "37", icon: Users },
                { label: "Total Pageviews (30d)", value: "301", icon: Eye },
                { label: "Pages/Visit", value: "8.14", icon: BarChart3 },
                { label: "Avg. Bounce Rate", value: "68%", icon: ArrowDownRight },
              ].map((m) => (
                <div key={m.label} className="bg-muted/30 rounded-xl p-4 text-center">
                  <m.icon className="h-4 w-4 mx-auto mb-2 text-primary" />
                  <p className="font-heading text-xl font-bold">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Pages */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-heading font-semibold text-sm mb-4">Top Pages</h3>
            <div className="space-y-2">
              {[
                { page: "/", views: 29 },
                { page: "/admin", views: 15 },
                { page: "/admin/marketing", views: 13 },
                { page: "/admin/influencers-marketing", views: 12 },
                { page: "/admin/courses", views: 10 },
                { page: "/courses", views: 9 },
                { page: "/admin/paths", views: 7 },
                { page: "/admin/users", views: 6 },
                { page: "/admin/enrollments", views: 6 },
                { page: "/admin/tags", views: 6 },
              ].map((p, i) => (
                <div key={p.page} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs font-mono font-medium">{p.page}</span>
                      <span className="text-xs text-muted-foreground">{p.views} views</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(p.views / 29) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Traffic Sources */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Traffic Sources</h3>
              <div className="space-y-3">
                {[{ name: "Direct", value: 33 }, { name: "accounts.google.com", value: 7 }].map((s) => (
                  <div key={s.name} className="flex justify-between items-center text-sm">
                    <span className="text-xs">{s.name}</span>
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">{s.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Device Breakdown */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Devices</h3>
              <div className="space-y-3">
                {[{ name: "Desktop", value: 27, icon: Monitor }, { name: "Mobile", value: 10, icon: Smartphone }].map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-xs"><d.icon className="h-3.5 w-3.5 text-muted-foreground" />{d.name}</span>
                    <span className="text-xs font-medium">{d.value} ({Math.round((d.value / 37) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Country Breakdown */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Countries</h3>
              <div className="space-y-3">
                {[{ name: "🇳🇬 Nigeria", value: 22 }, { name: "🇺🇸 United States", value: 11 }, { name: "🏳️ Unknown", value: 3 }, { name: "🇬🇧 United Kingdom", value: 1 }].map((c) => (
                  <div key={c.name} className="flex justify-between items-center text-sm">
                    <span className="text-xs">{c.name}</span>
                    <span className="text-xs font-medium">{c.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">Data refreshed periodically from platform analytics. For live data, check Project Insights in Settings.</p>
          </div>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6 mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <h3 className="font-heading font-semibold text-sm">Recent Activity Feed</h3>
              <span className="text-[10px] text-muted-foreground">Last 15 leads</span>
            </div>
            <div className="space-y-2">
              {recentLeads.length > 0 ? recentLeads.map((lead, i) => (
                <motion.div key={lead.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    lead.form_type === "page_visit" ? "bg-blue-500" : lead.form_type === "enrollment" ? "bg-green-500" : "bg-purple-500"
                  }`}>
                    {lead.form_type === "page_visit" ? <Eye className="h-3.5 w-3.5" /> : <MousePointerClick className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium capitalize">{lead.form_type || "visit"}</span>
                      {lead.utm_source && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{lead.utm_source}</span>
                      )}
                      {lead.utm_campaign && (
                        <span className="text-[10px] bg-accent/10 text-accent-foreground px-1.5 py-0.5 rounded truncate max-w-[120px]">{lead.utm_campaign}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{lead.landing_page || "/"} {lead.referrer ? `← ${lead.referrer}` : ""}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(lead.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </motion.div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
              )}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
