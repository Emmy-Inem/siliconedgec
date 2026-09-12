import { motion } from "framer-motion";

interface CampaignItem {
  name: string;
  visits: number;
  conversions: number;
  rate: number;
}

interface AnalyticsConversionsTabProps {
  totalVisits: number;
  totalConversions: number;
  enrollmentsCount: number;
  conversionRate: string | number;
  campaignData: CampaignItem[];
}

export function AnalyticsConversionsTab({
  totalVisits,
  totalConversions,
  enrollmentsCount,
  conversionRate,
  campaignData,
}: AnalyticsConversionsTabProps) {
  return (
    <div className="space-y-6 mt-4">
      {/* Conversion funnel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-5"
      >
        <h3 className="font-heading font-semibold text-sm mb-6">Conversion Funnel</h3>
        <div className="flex flex-col items-center gap-2">
          {[
            { label: "Page Visits", value: totalVisits, color: "bg-blue-500" },
            { label: "Leads Generated", value: totalConversions, color: "bg-primary" },
            { label: "Enrollments", value: enrollmentsCount, color: "bg-green-500" },
          ].map((step, i) => {
            const maxVal = Math.max(totalVisits, 1);
            const width = Math.max(20, (step.value / maxVal) * 100);
            return (
              <div key={step.label} className="w-full max-w-lg">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{step.label}</span>
                  <span className="text-muted-foreground">{step.value}</span>
                </div>
                <div
                  className={`h-10 ${step.color} rounded-lg flex items-center justify-center transition-all`}
                  style={{ width: `${width}%` }}
                >
                  <span className="text-white text-xs font-bold">{step.value}</span>
                </div>
                {i < 2 && (
                  <div className="flex justify-center py-1">
                    <span className="text-[10px] text-muted-foreground">
                      {i === 0
                        ? `${conversionRate}% conversion`
                        : `${totalConversions > 0 ? ((enrollmentsCount / totalConversions) * 100).toFixed(1) : 0}% to enrollment`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Campaign conversion table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border p-5"
      >
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
              {campaignData.length > 0 ? (
                campaignData.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-2.5 pr-4 font-medium">{row.name}</td>
                    <td className="py-2.5 pr-4 text-right">{row.visits}</td>
                    <td className="py-2.5 pr-4 text-right">{row.conversions}</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          row.rate > 10
                            ? "bg-green-500/10 text-green-600"
                            : row.rate > 0
                            ? "bg-yellow-500/10 text-yellow-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {row.rate}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No campaign data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
