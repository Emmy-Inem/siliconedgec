import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Target, Download, Filter, TrendingUp, Globe, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const COLORS = [
  "hsl(262, 83%, 58%)", "hsl(197, 100%, 47%)", "hsl(142, 71%, 45%)",
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

export default function AdminMarketingAnalytics() {
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [sourceFilter, setSourceFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");

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

  const filtered = useMemo(() => {
    let result = leads;
    const now = Date.now();
    if (dateFilter !== "all") {
      const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
      const cutoff = now - days * 86400000;
      result = result.filter(l => new Date(l.created_at).getTime() > cutoff);
    }
    if (sourceFilter) result = result.filter(l => l.utm_source === sourceFilter);
    if (campaignFilter) result = result.filter(l => l.utm_campaign === campaignFilter);
    return result;
  }, [leads, dateFilter, sourceFilter, campaignFilter]);

  const uniqueSources = [...new Set(leads.map(l => l.utm_source).filter(Boolean))];
  const uniqueCampaigns = [...new Set(leads.map(l => l.utm_campaign).filter(Boolean))];

  // Source breakdown
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => { const s = l.utm_source || "Direct"; map[s] = (map[s] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Campaign performance
  const campaignData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => { if (l.utm_campaign) map[l.utm_campaign] = (map[l.utm_campaign] ?? 0) + 1; });
    return Object.entries(map).map(([name, leads]) => ({ name, leads })).sort((a, b) => b.leads - a.leads).slice(0, 10);
  }, [filtered]);

  // Medium breakdown
  const mediumData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => { const m = l.utm_medium || "none"; map[m] = (map[m] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Source + Campaign table
  const tableData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => {
      const key = `${l.utm_source || "Direct"}|||${l.utm_campaign || "—"}`;
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([key, count]) => {
        const [source, campaign] = key.split("|||");
        return { source, campaign, leads: count };
      })
      .sort((a, b) => b.leads - a.leads);
  }, [filtered]);

  // Form type breakdown
  const formTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(l => { const ft = l.form_type || "unknown"; map[ft] = (map[ft] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

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
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Target className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Marketing Analytics</h1>
            <p className="text-sm text-muted-foreground">UTM attribution & lead source tracking</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
          downloadCSV("lead-sources.csv",
            ["Source", "Campaign", "Leads"],
            tableData.map(r => [r.source, r.campaign, String(r.leads)])
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
          {(["7d", "30d", "90d", "all"] as const).map(d => (
            <button key={d} onClick={() => setDateFilter(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dateFilter === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {d === "all" ? "All Time" : d === "7d" ? "7 Days" : d === "30d" ? "30 Days" : "90 Days"}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Leads", value: filtered.length, icon: TrendingUp, accent: "text-primary" },
          { label: "Sources", value: sourceData.length, icon: Globe, accent: "text-blue-500" },
          { label: "Campaigns", value: campaignData.length, icon: Megaphone, accent: "text-purple-500" },
          { label: "Form Types", value: [...new Set(filtered.map(l => l.form_type).filter(Boolean))].length, icon: Target, accent: "text-green-500" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border p-4 hover:border-primary/20 transition-all">
            <kpi.icon className={`h-5 w-5 ${kpi.accent} mb-2`} />
            <p className="font-heading text-2xl font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Traffic Sources</h3>
          <div className="h-64">
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} strokeWidth={2}>
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data yet</div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {sourceData.slice(0, 6).map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {s.name} ({s.value})
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-heading font-semibold text-sm mb-4">Campaign Performance</h3>
          <div className="h-64">
            {campaignData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="leads" fill="hsl(262, 83%, 58%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No campaigns tracked yet</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Lead Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">Lead Source Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Source</th>
                <th className="pb-2 pr-4 font-medium">Campaign</th>
                <th className="pb-2 font-medium text-right">Leads</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length > 0 ? tableData.slice(0, 20).map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="py-2.5 pr-4">{row.source}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.campaign}</td>
                  <td className="py-2.5 text-right font-semibold">{row.leads}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">No lead data yet. Share URLs with UTM parameters to start tracking.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
