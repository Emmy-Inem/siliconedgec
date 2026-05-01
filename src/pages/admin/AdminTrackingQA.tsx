import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Activity, Link2, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { getTikTokPixelStatus, getMetaPixelStatus, getGoogleAdsStatus, getPixelEventLog, subscribePixelEventLog, type TikTokPixelStatus, type MetaPixelStatus, type GoogleAdsStatus, type PixelEventLogEntry } from "@/lib/analytics";

/**
 * Tracking QA dashboard — confirms UTM + analytics events fire on every
 * route change and that they map to the right fields. Pulls the last 200
 * lead_sources rows and breaks them down by:
 *  - event volume per form_type (last 24h)
 *  - UTM coverage rate (% of rows with at least one utm_* field)
 *  - missing-field warnings (e.g. enrollment without course_id)
 */

type Row = {
  id: string;
  created_at: string;
  form_type: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_page: string | null;
  referrer: string | null;
  user_id: string | null;
  form_data: Record<string, unknown> | null;
};

function classifyHealth(row: Row): "ok" | "warn" | "error" {
  if (row.form_type === "enrollment" && !(row.form_data as any)?.course_id) return "error";
  if (row.form_type === "certificate_verify" && !(row.form_data as any)?.code) return "error";
  if (row.form_type === "page_visit" && !row.utm_source) return "warn";
  return "ok";
}

// Helpers for the Google Ads event-mapping table.
function GADS_LABEL(status: GoogleAdsStatus, key: string): string {
  const ev = status.configured_events.find((e) => e.key === key);
  return ev?.has_label ? "configured" : "account-level";
}
function GADS_LABEL_OK(status: GoogleAdsStatus, key: string): string {
  const ev = status.configured_events.find((e) => e.key === key);
  return ev?.has_label ? "text-emerald-500" : "text-amber-500";
}

const HealthIcon = ({ status }: { status: ReturnType<typeof classifyHealth> }) => {
  if (status === "ok") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "warn") return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
  return <XCircle className="h-3.5 w-3.5 text-red-500" />;
};

function ChecklistRow({ ok, label, hint, warnInsteadOfFail }: {
  ok: boolean;
  label: string;
  hint?: string;
  warnInsteadOfFail?: boolean;
}) {
  const Icon = ok
    ? CheckCircle2
    : warnInsteadOfFail
      ? AlertTriangle
      : XCircle;
  const colorClass = ok
    ? "text-emerald-500"
    : warnInsteadOfFail
      ? "text-amber-500"
      : "text-red-500";
  return (
    <li className="flex items-start gap-2">
      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{label}</p>
        {hint ? <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p> : null}
      </div>
    </li>
  );
}

export default function AdminTrackingQA() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-tracking-qa"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("lead_sources")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    refetchInterval: 15_000,
  });

  // TikTok Pixel runtime status — re-checked every 2s for up to ~10s so we
  // catch the SDK transition from "stub" → "loaded".
  const [ttStatus, setTtStatus] = useState<TikTokPixelStatus>(() => getTikTokPixelStatus());
  const [metaStatus, setMetaStatus] = useState<MetaPixelStatus>(() => getMetaPixelStatus());
  const [gadsStatus, setGadsStatus] = useState<GoogleAdsStatus>(() => getGoogleAdsStatus());
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      setTtStatus(getTikTokPixelStatus());
      setMetaStatus(getMetaPixelStatus());
      setGadsStatus(getGoogleAdsStatus());
      if (++n > 10) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Live event_id feed — subscribes to the in-memory ring buffer in
  // analytics.ts so admins can visually confirm a conversion fired with
  // the right event_id (which is what server-side Conversions API will
  // dedup against).
  const [eventLog, setEventLog] = useState<readonly PixelEventLogEntry[]>(() => getPixelEventLog());
  useEffect(() => subscribePixelEventLog((log) => setEventLog([...log])), []);

  // Detect <noscript> Meta fallback by querying the live DOM. We can't
  // probe a real "JS disabled" run, but we can confirm the markup that
  // crawlers + JS-blocked browsers will see is actually present.
  const [noscriptOk, setNoscriptOk] = useState(false);
  useEffect(() => {
    try {
      const tags = Array.from(document.getElementsByTagName("noscript"));
      const html = tags.map((n) => n.innerHTML).join("\n");
      setNoscriptOk(/facebook\.com\/tr\?id=802223455823137/.test(html));
    } catch { setNoscriptOk(false); }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const rows = data ?? [];
  const last24h = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 86_400_000);

  // Per form_type counts
  const byType = new Map<string, number>();
  last24h.forEach((r) => {
    const k = r.form_type ?? "unknown";
    byType.set(k, (byType.get(k) ?? 0) + 1);
  });
  const typeCounts = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);

  // UTM coverage
  const withUtm = last24h.filter((r) => r.utm_source || r.utm_campaign || r.utm_medium).length;
  const utmCoverage = last24h.length === 0 ? 0 : Math.round((withUtm / last24h.length) * 100);

  // Health breakdown
  const errored = rows.filter((r) => classifyHealth(r) === "error");
  const warned = rows.filter((r) => classifyHealth(r) === "warn");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-semibold">Tracking QA</h2>
          <p className="text-sm text-muted-foreground">
            Live feed of UTM + analytics events. Auto-refreshes every 15s.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 inline-flex items-center gap-2"
        >
          {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Events / 24h</p>
          <p className="text-3xl font-bold mt-1">{last24h.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">UTM coverage</p>
          <p className="text-3xl font-bold mt-1">{utmCoverage}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{withUtm} / {last24h.length} attributed</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Errors</p>
          <p className="text-3xl font-bold mt-1 text-red-500">{errored.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">missing required fields</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Warnings</p>
          <p className="text-3xl font-bold mt-1 text-amber-500">{warned.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">page_visit w/o utm_source</p>
        </Card>
      </div>

      {/* Per-event-type breakdown */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Event types (last 24h)</h3>
        {typeCounts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tracking events recorded in the last 24 hours.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {typeCounts.map(([t, n]) => (
              <Badge key={t} variant="secondary" className="font-mono text-xs">
                {t} <span className="ml-1.5 text-primary font-bold">{n}</span>
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* TikTok Pixel QA Checklist */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">TikTok Pixel QA Checklist</h3>
          <Badge variant="outline" className="font-mono text-[10px]">{ttStatus.pixel_id}</Badge>
        </div>
        <ul className="space-y-2 text-xs">
          <ChecklistRow ok={ttStatus.stub_present}
            label="Base snippet executed (window.ttq exists)"
            hint="Loaded from index.html on every page" />
          <ChecklistRow ok={ttStatus.sdk_loaded}
            label="SDK script downloaded (analytics.tiktok.com/i18n/pixel/events.js)"
            hint={ttStatus.sdk_loaded
              ? "Pixel Helper extension will detect this page."
              : "If this stays red after 5s, an ad-blocker (uBlock / Brave Shields / NextDNS) or in-app WebView is blocking events.js. The base snippet auto-retries once at 3s; beacons can still fire via /api/v2/pixel."} />
          <ChecklistRow ok={ttStatus.consent_granted}
            label="grantConsent() called for in-app browsers"
            hint="Required for FB/IG/TikTok WebViews where 3rd-party cookies are blocked." />
          <ChecklistRow ok={ttStatus.in_app_browser === null}
            label="Standard browser (not in-app WebView)"
            hint={ttStatus.in_app_browser
              ? `Detected ${ttStatus.in_app_browser} in-app browser — attribution may be limited; verify CompletePayment fires.`
              : "Open the site from inside Instagram/Facebook to test in-app coverage."}
            warnInsteadOfFail />
        </ul>
        <div className="mt-3 rounded-md bg-muted/40 p-2 text-[10px] font-mono break-all text-muted-foreground">
          UA: {ttStatus.user_agent || "—"}
        </div>
        <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Manual verification steps:</p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Install the <span className="font-mono">TikTok Pixel Helper</span> Chrome extension and open the site — should show pixel <span className="font-mono">{ttStatus.pixel_id}</span> with a <span className="font-mono">PageView</span> event.</li>
            <li>Open DevTools → Network → filter <span className="font-mono">tiktok</span>. You should see <span className="font-mono">events.js</span> (script) and <span className="font-mono">/api/v2/pixel</span> (POST 200).</li>
            <li>Trigger conversions in this order and confirm each beacon: <span className="font-mono">AddToCart</span> (Enroll Now) → <span className="font-mono">InitiateCheckout</span> (cart) → <span className="font-mono">CompletePayment</span> (after Paystack) → <span className="font-mono">Download</span> (certificate).</li>
            <li>In TikTok Ads Manager → Events Manager, set the pixel to <span className="font-mono">Test Event</span> mode and confirm events appear within ~30s.</li>
            <li>SPA route check: navigate Home → Courses → Pricing → Sign In; each route should fire a fresh <span className="font-mono">page</span> beacon (POST <span className="font-mono">/api/v2/pixel</span>).</li>
            <li>Mobile check: open the site in iOS Safari + Android Chrome + Instagram in-app browser; all should send a <span className="font-mono">PageView</span> within 4s of load.</li>
            <li>bfcache check: navigate forward to another site, then tap the back button. The pixel should re-fire <span className="font-mono">page</span> via the <span className="font-mono">pageshow</span> handler in <span className="font-mono">index.html</span>.</li>
          </ol>
        </div>
      </Card>

      {/* Meta (Facebook) Pixel QA Checklist */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Meta Pixel QA Checklist</h3>
          <Badge variant="outline" className="font-mono text-[10px]">{metaStatus.pixel_id}</Badge>
        </div>
        <ul className="space-y-2 text-xs">
          <ChecklistRow ok={metaStatus.stub_present}
            label="Base snippet executed (window.fbq exists)"
            hint="Loaded from index.html on every page" />
          <ChecklistRow ok={metaStatus.sdk_loaded}
            label="SDK script downloaded (connect.facebook.net/en_US/fbevents.js)"
            hint={metaStatus.sdk_loaded
              ? "Meta Pixel Helper extension will detect this page."
              : "If this stays red, an ad-blocker (uBlock / Brave Shields / NextDNS) is blocking fbevents.js. Beacons may still fire via /tr."} />
          <ChecklistRow ok={noscriptOk}
            label="<noscript> fallback present in DOM"
            hint={noscriptOk
              ? "Crawlers and JS-disabled browsers will still hit /tr?id=802223455823137&ev=PageView&noscript=1 on every route (SPA shell is index.html)."
              : "Could not find the <noscript> <img> tag for the Meta pixel — check index.html <body>."} />
          <ChecklistRow ok={metaStatus.in_app_browser === null}
            label="Standard browser (not in-app WebView)"
            hint={metaStatus.in_app_browser
              ? `Detected ${metaStatus.in_app_browser} in-app browser — verify Purchase fires; Conversions API recommended.`
              : "Open the site from inside Instagram/Facebook to test in-app coverage."}
            warnInsteadOfFail />
        </ul>
        <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Manual verification steps:</p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Install the <span className="font-mono">Meta Pixel Helper</span> Chrome extension and open the site — should show pixel <span className="font-mono">{metaStatus.pixel_id}</span> with a <span className="font-mono">PageView</span> event.</li>
            <li>Open DevTools → Network → filter <span className="font-mono">facebook.com/tr</span>. Each event fires a GET to <span className="font-mono">/tr</span> with <span className="font-mono">id={metaStatus.pixel_id}</span>.</li>
            <li>Trigger conversions and confirm in Meta Events Manager → Test Events: <span className="font-mono">AddToCart</span> → <span className="font-mono">InitiateCheckout</span> → <span className="font-mono">Purchase</span> (after Paystack) → <span className="font-mono">DownloadCertificate</span> (custom).</li>
            <li>SPA route check: navigate Home → Courses → Pricing; each route should fire a fresh <span className="font-mono">PageView</span>.</li>
            <li>bfcache + visibility: tab away and return — <span className="font-mono">PageView</span> should re-fire (covers iOS in-app browser sleep).</li>
          </ol>
        </div>
      </Card>

      {/* Google Ads QA Checklist + Event Mapping */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Google Ads conversion tracking</h3>
          <Badge variant="outline" className="font-mono text-[10px]">{gadsStatus.account_id}</Badge>
        </div>
        <ul className="space-y-2 text-xs">
          <ChecklistRow ok={gadsStatus.datalayer_present}
            label="window.dataLayer initialised"
            hint="Loaded inline from index.html before gtag.js." />
          <ChecklistRow ok={gadsStatus.gtag_loaded}
            label="gtag.js script downloaded (googletagmanager.com)"
            hint={gadsStatus.gtag_loaded
              ? "Conversions and Enhanced Conversions can fire."
              : "Likely blocked by ad-blocker. Beacons still queue in dataLayer and replay if a script later loads."} />
          <ChecklistRow ok={gadsStatus.consent_default_set}
            label="Consent Mode v2 defaults set before first hit"
            hint="ad_storage / ad_user_data / ad_personalization start denied; CookieBanner flips them on Accept all." />
          <ChecklistRow ok={gadsStatus.configured_events.every((e) => e.has_label)}
            label="All conversion labels configured"
            warnInsteadOfFail
            hint={gadsStatus.configured_events.every((e) => e.has_label)
              ? "Each event sends to a labelled conversion action."
              : "Some events fall back to account-level send_to (still recorded under the AW account, but won't drive bidding until labels are pasted into src/lib/analytics.ts → GOOGLE_ADS_EVENTS)."} />
        </ul>

        <div className="mt-4">
          <p className="text-[11px] font-medium mb-2">Event mapping (call site → Google Ads / GA4)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-1.5 pr-3">Trigger</th>
                  <th className="py-1.5 pr-3">Conversion key</th>
                  <th className="py-1.5 pr-3">GA4 event</th>
                  <th className="py-1.5 pr-3">Label</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-b"><td className="py-1.5 pr-3">Course "Enroll Now" / Add to cart</td><td>AddToCart</td><td>add_to_cart</td><td className={GADS_LABEL_OK(gadsStatus, "AddToCart")}>{GADS_LABEL(gadsStatus, "AddToCart")}</td></tr>
                <tr className="border-b"><td className="py-1.5 pr-3">Cart → Paystack handoff</td><td>InitiateCheckout</td><td>begin_checkout</td><td className={GADS_LABEL_OK(gadsStatus, "InitiateCheckout")}>{GADS_LABEL(gadsStatus, "InitiateCheckout")}</td></tr>
                <tr className="border-b"><td className="py-1.5 pr-3">Free enrollment confirmed</td><td>CompleteRegistration</td><td>sign_up</td><td className={GADS_LABEL_OK(gadsStatus, "CompleteRegistration")}>{GADS_LABEL(gadsStatus, "CompleteRegistration")}</td></tr>
                <tr className="border-b"><td className="py-1.5 pr-3">Paid enrollment (Paystack verified)</td><td>Purchase</td><td>purchase</td><td className={GADS_LABEL_OK(gadsStatus, "Purchase")}>{GADS_LABEL(gadsStatus, "Purchase")}</td></tr>
                <tr className="border-b"><td className="py-1.5 pr-3">Webinar registration submitted</td><td>WebinarRegistration</td><td>generate_lead</td><td className={GADS_LABEL_OK(gadsStatus, "WebinarRegistration")}>{GADS_LABEL(gadsStatus, "WebinarRegistration")}</td></tr>
                <tr><td className="py-1.5 pr-3">Generic lead form (future)</td><td>Lead</td><td>generate_lead</td><td className={GADS_LABEL_OK(gadsStatus, "Lead")}>{GADS_LABEL(gadsStatus, "Lead")}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Setup &amp; verification</p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>In Google Ads → <span className="font-mono">Tools → Conversions</span>, create a conversion action for each row above (or import GA4 key events).</li>
            <li>Open the action → "Tag setup" → "Use Google tag" → copy the value after <span className="font-mono">/</span> in <span className="font-mono">send_to: 'AW-…/LABEL'</span>.</li>
            <li>Paste each label into <span className="font-mono">GOOGLE_ADS_EVENTS</span> in <span className="font-mono">src/lib/analytics.ts</span>.</li>
            <li>Enable <span className="font-mono">Enhanced conversions</span> on the action and choose "Google tag" — hashed email + phone are already being sent via <span className="font-mono">setGoogleAdsUserData()</span>.</li>
            <li>Use the <span className="font-mono">Google Tag Assistant</span> Chrome extension to confirm <span className="font-mono">conversion</span> events fire on this site with the right account.</li>
            <li>SPA route check: navigate Home → Courses → Pricing; gtag pageviews fire from <span className="font-mono">gaPageview()</span> (analytics.ts) on every route change.</li>
          </ol>
        </div>
      </Card>

      {/* Event-ID live feed (TikTok + Meta) */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Pixel event_id log (this tab)</h3>
          <Badge variant="outline" className="text-[10px]">{eventLog.length} events</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Every conversion fired in this browser tab. Each <span className="font-mono">event_id</span> is the dedup key the server-side Conversions API will use. Also available as <span className="font-mono">window.__pixelLog</span> in DevTools.
        </p>
        {eventLog.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No conversions fired yet in this tab. Trigger an Enroll Now / Add to Cart / Purchase to populate.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3"><Clock className="h-3 w-3 inline" /> Time</th>
                  <th className="py-2 pr-3">Vendor</th>
                  <th className="py-2 pr-3">Event</th>
                  <th className="py-2 pr-3">event_id</th>
                </tr>
              </thead>
              <tbody>
                {eventLog.slice(0, 25).map((e) => (
                  <tr key={e.event_id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">
                      {format(new Date(e.ts), "HH:mm:ss")}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant={e.vendor === "meta" ? "default" : "secondary"} className="text-[10px] font-mono">
                        {e.vendor}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 font-mono">{e.event}</td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground truncate max-w-[260px]">{e.event_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent events feed */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm">Recent events (last {rows.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"><Clock className="h-3 w-3 inline" /> Time</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3"><MapPin className="h-3 w-3 inline" /> Path</th>
                <th className="py-2 pr-3"><Link2 className="h-3 w-3 inline" /> UTM</th>
                <th className="py-2 pr-3">Form data</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 60).map((r) => {
                const health = classifyHealth(r);
                const utmBits = [r.utm_source, r.utm_medium, r.utm_campaign].filter(Boolean).join(" / ");
                const fdKeys = r.form_data ? Object.keys(r.form_data).slice(0, 4).join(", ") : "—";
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-3"><HealthIcon status={health} /></td>
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">
                      {format(new Date(r.created_at), "MMM dd HH:mm:ss")}
                    </td>
                    <td className="py-2 pr-3 font-mono">{r.form_type ?? "—"}</td>
                    <td className="py-2 pr-3 truncate max-w-[180px]">{r.landing_page ?? "—"}</td>
                    <td className="py-2 pr-3 truncate max-w-[180px] text-muted-foreground">{utmBits || "—"}</td>
                    <td className="py-2 pr-3 font-mono text-muted-foreground truncate max-w-[220px]">{fdKeys}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
