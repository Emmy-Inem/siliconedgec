import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckoutTerms, PAYMENT_TERMS_VERSION } from "./CheckoutTerms";
import { readFunctionError } from "@/lib/function-error";

export async function installmentRequest(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("course-installments", { body });
  if (error) throw await readFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function FlexiblePaymentButton({ courseIds, currency, disabled, promoCodeId }: { courseIds: string[]; currency: string; disabled?: boolean; promoCodeId?: string | null }) {
  const { user } = useAuth(); const navigate = useNavigate();
  const [open, setOpen] = useState(false); const [count, setCount] = useState(2);
  const [quote, setQuote] = useState<any>(null); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [accepted, setAccepted] = useState(false); const [scheduleAccepted, setScheduleAccepted] = useState(false);
  const money = (minor: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: quote.currency }).format(minor / quote.factor);
  const signature = JSON.stringify({ courseIds, currency, count, promoCodeId });
  const validQuote = quote?.signature === signature;
  return <>
    <Button variant="outline" className="w-full" disabled={disabled} onClick={() => {
      if (!user) { navigate(`/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`); return; }
      setOpen(true); setQuote(null); setError(""); setAccepted(false); setScheduleAccepted(false);
    }}>Flexible payment — pay in installments</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Flexible weekly payments</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Choose how many weekly payments you need. Your plan must finish before the final week of every selected course. No automatic charges.</p>
      <label className="text-sm">Number of weekly payments
        <input aria-label="Number of weekly payments" className="block w-full rounded border border-border bg-background p-2 mt-1" type="number" min={2} max={103} value={count} onChange={e => { setCount(Number(e.target.value)); setAccepted(false); setScheduleAccepted(false); }} />
      </label>
      <Button variant="outline" disabled={busy} onClick={async () => {
        setBusy(true); setError(""); setQuote(null); setAccepted(false); setScheduleAccepted(false);
        try { const data = await installmentRequest({ action: "quote", course_ids: courseIds, currency, count, promo_code_id: promoCodeId }); setQuote({ ...data, signature }); }
        catch (e) { setError((e as Error).message); } finally { setBusy(false); }
      }}>{busy ? "Loading…" : "Show my payment schedule"}</Button>
      {validQuote && <>
        <p className="font-medium">Total: {money(quote.total_minor)}</p>
        <ol className="space-y-2 text-sm">{quote.schedule.map((p: any) => <li key={p.number} className="flex justify-between gap-3"><span>{p.number === 1 ? "First payment — today" : new Date(p.due_at).toLocaleDateString()}</span><strong>{money(p.amount_minor)}</strong></li>)}</ol>
        <p className="text-sm">Final balance deadline: <strong>{new Date(quote.deadline).toLocaleString()}</strong>. If unpaid when the final week starts, course access is suspended. Certificates are withheld until full payment and course completion.</p>
        <CheckoutTerms accepted={accepted} onChange={setAccepted} />
        <label className="flex gap-3 items-start text-sm"><input className="mt-1" type="checkbox" checked={scheduleAccepted} onChange={e => setScheduleAccepted(e.target.checked)} /><span>I accept this payment schedule, final deadline and access and certificate conditions.</span></label>
        <Button disabled={busy || !accepted || !scheduleAccepted} onClick={async () => {
          setBusy(true); setError("");
          try { const data = await installmentRequest({ action: "start", course_ids: courseIds, currency, count, promo_code_id: promoCodeId, terms_accepted: accepted, terms_version: PAYMENT_TERMS_VERSION, installment_terms_accepted: scheduleAccepted, approved_quote: { total_minor: quote.total_minor, currency: quote.currency, schedule: quote.schedule, deadline: quote.deadline } }); setOpen(false); navigate(`/flexible-payments?agreement_id=${data.agreement_id}`); }
          catch (e) { setError((e as Error).message); } finally { setBusy(false); }
        }}>Continue with this plan</Button>
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <a href="/flexible-payments" className="text-sm text-primary underline">My flexible payments</a>
    </DialogContent></Dialog>
  </>;
}
