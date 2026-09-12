import { motion } from "framer-motion";
import { Eye, MousePointerClick } from "lucide-react";
import { isPageViewFormType, isCourseConversionFormType } from "@/lib/analytics-helpers";

interface Lead {
  id: string;
  form_type?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
  created_at: string;
}

interface AnalyticsRealtimeTabProps {
  recentLeads: Lead[];
}

export function AnalyticsRealtimeTab({ recentLeads }: AnalyticsRealtimeTabProps) {
  return (
    <div className="space-y-6 mt-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-heading font-semibold text-sm">Recent Activity Feed</h3>
          <span className="text-[10px] text-muted-foreground">Last 15 leads</span>
        </div>
        <div className="space-y-2">
          {recentLeads.length > 0 ? (
            recentLeads.map((lead, i) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    isPageViewFormType(lead.form_type)
                      ? "bg-blue-500"
                      : isCourseConversionFormType(lead.form_type)
                      ? "bg-green-500"
                      : "bg-primary"
                  }`}
                >
                  {isPageViewFormType(lead.form_type) ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <MousePointerClick className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium capitalize">{lead.form_type || "visit"}</span>
                    {lead.utm_source && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {lead.utm_source}
                      </span>
                    )}
                    {lead.utm_campaign && (
                      <span className="text-[10px] bg-accent/10 text-accent-foreground px-1.5 py-0.5 rounded truncate max-w-[120px]">
                        {lead.utm_campaign}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {lead.landing_page || "/"} {lead.referrer ? `← ${lead.referrer}` : ""}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(lead.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
