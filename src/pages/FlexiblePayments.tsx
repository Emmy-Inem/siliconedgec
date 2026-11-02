import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { installmentRequest } from "@/components/FlexiblePaymentButton";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { currencyFactor } from "../../supabase/functions/_shared/currency-config";

export default function FlexiblePayments() {
  const { user } = useAuth(); const [params, setParams] = useSearchParams(); const qc = useQueryClient();
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const { data = [], isLoading, error } = useQuery({ queryKey: ["my-weekly-payments", user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await (supabase as any).from("course_payment_agreements").select("*, course_payment_installments(*)").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (error) throw error; return data;
  } });
  useEffect(() => {
    const paymentId = params.get("payment_id"); if (!user || !paymentId) return;
    let active = true; setBusy(true);
    installmentRequest({ action: "verify", payment_id: paymentId }).then(result => {
      if (!active) return;
      setMessage(result.verified ? "Payment confirmed. Your balance has been updated." : "Payment is still processing. Check again shortly.");
      if (result.verified) { setParams({}, { replace: true }); void qc.invalidateQueries({ queryKey: ["my-weekly-payments"] }); }
    }).catch(e => { if (active) setMessage(e.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [user?.id, params.get("payment_id")]);
  return <><Header /><main className="container mx-auto px-4 pt-32 pb-16 min-h-screen space-y-6"><h1 className="font-heading text-3xl font-bold">My flexible payments</h1>
    <p>No automatic charges. Pay each installment here. Complete your balance before the final week starts to keep access; certificates require full payment and course completion.</p>
    {!user && <Button asChild><Link to="/sign-in?redirect=%2Fflexible-payments">Sign in to view payments</Link></Button>}
    {isLoading && <p>Loading payment plans…</p>}{error && <p role="alert">Unable to load payment plans. Please try again shortly.</p>}
    {message && <p role="status">{message}</p>}
    {user && !isLoading && !error && !data.length && <p>You have no flexible payment plans yet. Choose Flexible payment at checkout to review a schedule.</p>}
    {data.map((a: any) => {
      const money = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: a.currency }).format(n / currencyFactor(a.currency));
      const complete = Number(a.amount_paid_minor) >= Number(a.total_minor);
      const next = a.schedule.find((p: any) => !a.course_payment_installments.some((paid: any) => paid.number === p.number && paid.status === "paid"));
      return <section key={a.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold">{complete ? "Fully paid" : "Weekly payment plan"}</h2><p className="text-xs text-muted-foreground">Plan: {a.id}</p>
        <p>Total: {money(a.total_minor)} · Paid: {money(a.amount_paid_minor)} · Balance: {money(a.total_minor - a.amount_paid_minor)}</p>
        <p>Final deadline: {new Date(a.final_deadline).toLocaleString()}</p>
        {!complete && Date.now() >= new Date(a.final_deadline).getTime() && <p className="text-destructive">Balance overdue. Course access is suspended and your certificate is withheld.</p>}
        <ol className="text-sm space-y-2">{a.schedule.map((p: any) => <li key={p.number}>{new Date(p.due_at).toLocaleDateString()} — {money(p.amount_minor)} — {a.course_payment_installments.some((paid: any) => paid.number === p.number && paid.status === "paid") ? "Paid" : "Unpaid"}</li>)}</ol>
        {next && <Button disabled={busy} onClick={async () => { setBusy(true); setMessage(""); try { const result = await installmentRequest({ action: "pay", agreement_id: a.id }); window.location.assign(result.authorization_url); } catch (e) { setMessage((e as Error).message); setBusy(false); } }}>Pay installment {next.number} ({money(next.amount_minor)})</Button>}
        {a.course_payment_installments.filter((p: any) => p.status === "pending").map((p: any) => <Button key={p.id} variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { const result = await installmentRequest({ action: "verify", payment_id: p.id }); setMessage(result.verified ? "Payment confirmed." : "Payment not yet confirmed."); await qc.invalidateQueries({ queryKey: ["my-weekly-payments"] }); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } }}>Check payment status</Button>)}
      </section>;
    })}
  </main><Footer /></>;
}
