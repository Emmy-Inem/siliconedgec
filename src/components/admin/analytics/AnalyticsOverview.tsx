import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, UserPlus, LogIn, Eye, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CustomDateRange } from "@/components/admin/CustomDateRange";
import { analyticsRange, analyticsPreset, AudienceAnalytics } from "@/lib/audience-analytics";
import JourneyInsights from "./JourneyInsights";

function Breakdown({ title, rows, label = "Page views" }: { title: string; rows: { name: string; views: number }[]; label?: string }) {
  return <section className="min-w-0 space-y-3">
    <h3 className="font-heading font-semibold">{title}</h3>
    {rows.length === 0 ? <p className="text-sm text-muted-foreground py-6">No recorded data in this period.</p> :
      <table className="w-full text-sm table-fixed">
        <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left pb-2 font-normal">{title === "Most-visited pages" ? "Page" : "Name"}</th><th className="text-right pb-2 font-normal w-24">{label}</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.name} className="border-b border-border/50"><td className="py-3 pr-3 break-words">{row.name}</td><td className="py-3 text-right tabular-nums">{row.views.toLocaleString()}</td></tr>)}</tbody>
      </table>}
  </section>;
}

export default function AnalyticsOverview() {
  const { adminRole } = useAuth();
  const [dates, setDates] = useState(() => analyticsPreset(30));
  const [preset, setPreset] = useState<number | null>(30);
  const range = analyticsRange(dates.from, dates.to);
  const query = useQuery({
    queryKey: ["admin-audience-analytics", dates.from, dates.to],
    enabled: adminRole === "admin" && !!range,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!range) throw new Error("Choose a valid date range.");
      const { data, error } = await supabase.rpc("admin_audience_analytics", range);
      if (error) throw error;
      return data as unknown as AudienceAnalytics;
    },
  });
  if (adminRole !== "admin") return <p className="text-sm text-muted-foreground">Website audience reports are available to administrators.</p>;
  const stats = query.data;
  const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
  return <div className="space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Analytics period">
        {[1, 7, 30, 90].map(days => <Button key={days} size="sm" variant={preset === days ? "default" : "outline"} onClick={() => { setPreset(days); setDates(analyticsPreset(days)); }}>{days === 1 ? "Today" : `${days} days`}</Button>)}
        <CustomDateRange from={dates.from} to={dates.to} onChange={(from, to) => { setPreset(null); setDates({ from, to }); }} className="flex-wrap" />
      </div>
      <Button variant="ghost" size="icon" aria-label="Refresh analytics" title="Refresh analytics" disabled={query.isFetching || !range} onClick={() => query.refetch()}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /></Button>
    </div>
    <p className="text-xs text-muted-foreground">{dates.from} – {dates.to} · UTC</p>
    {!range ? <p role="alert" className="text-sm text-destructive">Choose a valid start and end date.</p> : query.isError ? <div role="alert" className="space-y-2"><p className="text-sm text-destructive">Analytics could not be loaded. No figures have been substituted.</p><Button variant="outline" onClick={() => query.refetch()}>Try again</Button></div> : query.isLoading ? <p role="status" className="text-sm text-muted-foreground py-12">Loading analytics…</p> : stats && <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "New signups", value: stats.signups, icon: UserPlus },
          { label: "Recorded visitors", value: stats.visitors, icon: Users },
          { label: "People who logged in", value: stats.loggedInPeople, icon: LogIn },
          { label: "Page views", value: stats.pageviews, icon: Eye },
        ].map(item => <div key={item.label} className="rounded-lg border border-border bg-card p-4 sm:p-5"><item.icon className="h-4 w-4 text-muted-foreground mb-3" /><p className="font-heading text-3xl font-semibold tabular-nums">{item.value.toLocaleString()}</p><p className="text-sm text-muted-foreground mt-1">{item.label}</p></div>)}
      </div>
      {stats.unidentifiedViews > 0 && <p className="text-xs text-muted-foreground">{stats.unidentifiedViews.toLocaleString()} older anonymous page views have no visitor identifier and are not counted as separate people.</p>}
      <section className="space-y-4 border-b border-border pb-6">
        <h3 className="font-heading font-semibold">Signups & logins over time</h3>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={stats.daily} margin={{ top: 5, right: 8, bottom: 5, left: -20 }}>
            <XAxis dataKey="day" tickFormatter={value => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })} tick={{ fontSize: 11 }} minTickGap={35} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip /><Legend />
            <Line dataKey="signups" name="Signups" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="logins" name="People who logged in" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart></ResponsiveContainer>
        </div>
      </section>
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        <Breakdown title="Most-visited pages" rows={stats.pages.map(p => ({ name: p.page || "/", views: p.views }))} />
        <Breakdown title="Countries" rows={stats.countries.map(c => ({ name: c.name === "Unknown" ? "Location unavailable" : countryNames.of(c.name) || c.name, views: c.views }))} />
        <Breakdown title="Traffic sources" rows={stats.sources} />
        <Breakdown title="Devices" rows={stats.devices} />
      </div>
      <p className="text-xs text-muted-foreground">Visitor counts represent recorded browsers or signed-in accounts, not guaranteed individual people. Missing locations remain unavailable.</p>
    </>}
    {range && <JourneyInsights range={range} />}
  </div>;
}