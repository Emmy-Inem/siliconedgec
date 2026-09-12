import { motion } from "framer-motion";
import {
  BarChart3, Users, Eye, ArrowUpRight, Laptop, Smartphone, Monitor, Globe
} from "lucide-react";

export interface TrafficStats {
  uniqueVisitors: number;
  totalViews: number;
  pagesPerVisit: string;
  topPages: Array<{ page: string; views: number }>;
  devices: Array<{ name: string; value: number }>;
  sources: Array<{ name: string; value: number }>;
  languages: Array<{ name: string; value: number }>;
  countries: Array<{ code: string; value: number }>;
  cities: Array<{ name: string; country?: string; value: number }>;
  cityTotal: number;
  countryTotal: number;
  maxPageViews: number;
  deviceTotal: number;
}

interface AnalyticsSiteTrafficTabProps {
  trafficStats: TrafficStats;
  dateFilter: string;
  conversionRate: string | number;
}

export function AnalyticsSiteTrafficTab({
  trafficStats,
  dateFilter,
  conversionRate,
}: AnalyticsSiteTrafficTabProps) {
  return (
    <div className="space-y-6 mt-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm">Platform Site Analytics</h3>
          <span className="ml-auto text-[10px] text-muted-foreground">
            Period: {dateFilter === "all" ? "All time" : dateFilter}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-4">
          Live data computed from <code>lead_sources</code>. Anonymous visitors are best-effort
          (one row = one anonymous visit). For deep insights, connect GA4 in Settings.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Visitors", value: trafficStats.uniqueVisitors.toLocaleString(), icon: Users },
            { label: "Pageviews", value: trafficStats.totalViews.toLocaleString(), icon: Eye },
            { label: "Pages/Visit", value: trafficStats.pagesPerVisit, icon: BarChart3 },
            { label: "Conversion Rate", value: `${conversionRate}%`, icon: ArrowUpRight },
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border p-5"
      >
        <h3 className="font-heading font-semibold text-sm mb-4">Top Pages</h3>
        <div className="space-y-2">
          {trafficStats.topPages.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">No pageviews recorded yet for this period.</p>
          )}
          {trafficStats.topPages.map((p, i) => (
            <div key={p.page} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs font-mono font-medium truncate max-w-[60%]" title={p.page}>
                    {p.page}
                  </span>
                  <span className="text-xs text-muted-foreground">{p.views} views</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(p.views / trafficStats.maxPageViews) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl border border-border p-5"
        >
          <h3 className="font-heading font-semibold text-sm mb-4">Traffic Sources</h3>
          <div className="space-y-3">
            {trafficStats.sources.length === 0 && (
              <p className="text-xs text-muted-foreground">No referrer data yet.</p>
            )}
            {trafficStats.sources.map((s) => (
              <div key={s.name} className="flex justify-between items-center text-sm">
                <span className="text-xs truncate max-w-[70%]" title={s.name}>
                  {s.name}
                </span>
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Device Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-5"
        >
          <h3 className="font-heading font-semibold text-sm mb-4">Devices</h3>
          <div className="space-y-3">
            {trafficStats.devices.length === 0 && (
              <p className="text-xs text-muted-foreground">No device data yet.</p>
            )}
            {trafficStats.devices.map((d) => {
              const Icon =
                d.name === "Mobile"
                  ? Smartphone
                  : d.name === "Tablet"
                  ? Laptop
                  : d.name === "Desktop"
                  ? Monitor
                  : Globe;
              return (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-xs">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {d.name}
                  </span>
                  <span className="text-xs font-medium">
                    {d.value} ({Math.round((d.value / trafficStats.deviceTotal) * 100)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Languages — only renders if we have data */}
      {trafficStats.languages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold text-sm">Visitor Languages</h3>
            <span className="ml-auto text-[10px] text-muted-foreground">Browser locale (not geo)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {trafficStats.languages.map((l) => (
              <div key={l.name} className="flex items-center justify-between text-xs bg-muted/30 px-3 py-2 rounded-lg">
                <span className="font-mono">{l.name}</span>
                <span className="font-medium">{l.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Visitor countries */}
      {trafficStats.countries.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold text-sm">Visitor Countries</h3>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Edge-resolved (Cloudflare) · {trafficStats.countryTotal} attributed visits
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {trafficStats.countries.map((c) => (
              <div key={c.code} className="flex items-center justify-between text-xs bg-muted/30 px-3 py-2 rounded-lg">
                <span className="font-mono">{c.code}</span>
                <span className="font-medium">
                  {c.value} ({Math.round((c.value / trafficStats.countryTotal) * 100)}%)
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            For demographic detail (age, interests, full city) see GA4 → Reports → Demographics.
          </p>
        </motion.div>
      ) : (
        <div className="bg-muted/20 border border-border rounded-2xl p-4 text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Visitor countries — collecting…</strong> Geo is now resolved on
          every pageview via Cloudflare's edge. Country data will appear here as new visits come in. For
          richer geo (region/city + acquisition by country) open <em>GA4 → Reports → Demographics</em>.
        </div>
      )}

      {/* Visitor cities */}
      {trafficStats.cities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold text-sm">Visitor Cities</h3>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {trafficStats.cityTotal} attributed visits
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {trafficStats.cities.map((c) => (
              <div key={`${c.name}-${c.country}`} className="flex items-center justify-between text-xs bg-muted/30 px-3 py-2 rounded-lg">
                <span className="truncate">
                  {c.name}
                  {c.country && <span className="ml-1 text-[10px] text-muted-foreground font-mono">{c.country}</span>}
                </span>
                <span className="font-medium ml-2">{c.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="text-center">
        <p className="text-xs text-muted-foreground">All numbers above are computed live from your tracked events — no estimates.</p>
      </div>
    </div>
  );
}
