import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Sparkles, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { JourneyAnalytics, journeyPageLabel, reachPercent } from "@/lib/journey-analytics";

export default function JourneyInsights({ range }: { range: { p_from: string; p_to: string } }) {
  const query = useQuery({
    queryKey: ["admin-journey-analytics", range.p_from, range.p_to],
    staleTime: 300_000, refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_journey_analytics", range);
      if (error) throw error;
      return data as unknown as JourneyAnalytics;
    },
  });
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const report = query.data;
  useEffect(() => { abort.current?.abort(); setSummary(""); setError(""); setBusy(false); return () => abort.current?.abort(); }, [range.p_from, range.p_to]);
  async function generate() {
    const controller = new AbortController(); abort.current = controller;
    setBusy(true); setSummary(""); setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in again.");
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-ai-summary`, {
        method: "POST", signal: controller.signal,
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(range),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Summary unavailable."); }
      if (!response.body) throw new Error("No summary received.");
      const reader = response.body.getReader(); const decoder = new TextDecoder();
      let text = "";
      while (true) { const chunk = await reader.read(); if (chunk.done) break; text += decoder.decode(chunk.value, { stream: true }); setSummary(text); }
      if (!text.trim()) throw new Error("No summary received.");
    } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Summary unavailable."); }
    finally { if (abort.current === controller) setBusy(false); }
  }
  return <div className="space-y-8 border-t border-border pt-8">
    <section className="space-y-4">
      <h2 className="font-heading text-xl font-semibold">After signup</h2>
      <p className="text-sm text-muted-foreground">Accounts created in the selected period, observed through its end. Each milestone is counted independently; optional activity appears only after consent.</p>
      {query.isLoading ? <p role="status">Loading journeys…</p> : query.isError ? <div role="alert"><p className="text-destructive text-sm">Journey reports could not be loaded.</p><Button variant="outline" onClick={() => query.refetch()}>Try again</Button></div> : report && <>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <p><strong className="text-foreground">{report.cohortSize}</strong> new learner accounts</p>
          <p><strong className="text-foreground">{report.observedPeople}</strong> with recorded journeys</p>
          <p><strong className="text-foreground">{report.checkoutWithoutPayment}</strong> checkout starters unpaid after 24h</p>
        </div>
        {report.cohortSize === 0 ? <p className="py-8 text-sm text-muted-foreground">No new learner accounts in this period.</p> : <div className="h-80 min-w-0" aria-label="Post-signup milestone chart">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={report.stages} layout="vertical" margin={{ left: 0, right: 24 }}>
            <XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="stage" width={128} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value: number) => [`${value} (${reachPercent(value, report.cohortSize)}%)`, "Learners"]} />
            <Bar dataKey="people" fill="hsl(var(--primary))" isAnimationActive={false} />
          </BarChart></ResponsiveContainer>
        </div>}
        <p className="text-xs text-muted-foreground">{report.trackingSince ? `Journey records begin ${new Date(report.trackingSince).toLocaleDateString("en-GB", { timeZone: "UTC" })}.` : "Journey tracking has not recorded any activity yet."} Newer accounts have less time to progress. Unpaid checkout is not proof of abandonment.</p>
      </>}
    </section>
    {report && <div className="grid lg:grid-cols-2 gap-8">
      <section className="space-y-3"><h3 className="font-heading font-semibold">Where journeys last stopped</h3><p className="text-xs text-muted-foreground">Last observed pages in signup-cohort sessions inactive for at least 30 minutes. Not confirmed exits.</p>
        {report.endpoints.length ? <ul className="divide-y divide-border">{report.endpoints.map(row => <li key={row.path} className="flex justify-between gap-4 py-3 text-sm"><span className="break-words min-w-0">{journeyPageLabel(row.path)}</span><span className="shrink-0 tabular-nums">{row.sessions} sessions</span></li>)}</ul> : <p className="text-sm text-muted-foreground py-5">No inactive journeys recorded.</p>}
      </section>
      <section className="space-y-3"><h3 className="font-heading font-semibold">Problems visitors encountered</h3><p className="text-xs text-muted-foreground">Recorded signup, sign-in and checkout errors across visitors in this period.</p>
        {report.friction.length ? <ul className="divide-y divide-border">{report.friction.map(row => <li key={`${row.path}-${row.reason}`} className="flex justify-between gap-4 py-3 text-sm"><span className="min-w-0 break-words">{journeyPageLabel(row.path)} · {row.reason.replace(/_/g, " ")}</span><span className="shrink-0">{row.events} errors</span></li>)}</ul> : <p className="text-sm text-muted-foreground py-5">No errors recorded. This does not rule out untracked problems.</p>}
      </section>
      <section className="space-y-3 lg:col-span-2"><h3 className="font-heading font-semibold">Common next steps</h3>
        {report.transitions.length ? <ul className="grid sm:grid-cols-2 gap-x-8">{report.transitions.map(row => <li key={`${row.from_page}-${row.to_page}`} className="flex justify-between gap-4 border-b border-border py-3 text-sm"><span className="min-w-0 break-words">{journeyPageLabel(row.from_page)} → {journeyPageLabel(row.to_page)}</span><span>{row.transitions}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No page-to-page journeys recorded yet.</p>}
      </section>
    </div>}
    <section className="border-t border-border pt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-xl font-semibold">AI summary</h2>{busy ? <Button variant="outline" onClick={() => abort.current?.abort()}><Square className="h-4 w-4 mr-2" />Stop</Button> : <Button onClick={generate} disabled={!report || query.isFetching}><Sparkles className="h-4 w-4 mr-2" />{summary ? "Refresh summary" : "Generate summary"}</Button>}</div>
      <p className="text-xs text-muted-foreground">Observed results, possible explanations and recommended checks. Aggregated counts only; no individual profiles.</p>
      {busy && <p role="status" className="text-sm text-muted-foreground">Reviewing the selected period…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {summary && <div className="prose prose-sm dark:prose-invert max-w-none break-words"><ReactMarkdown>{summary}</ReactMarkdown></div>}
    </section>
  </div>;
}