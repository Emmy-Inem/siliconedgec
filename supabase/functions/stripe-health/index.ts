// Temporary diagnostic: checks the Stripe key is valid (returns no secrets).
Deno.serve(async () => {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim();
  const prefix = key.slice(0, 8);
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions?limit=1", { headers: { Authorization: `Bearer ${key}` } });
  const j = await res.json();
  return new Response(JSON.stringify({ status: res.status, prefix: prefix.replace(/[A-Za-z0-9]{3}$/, "***"), len: key.length, err: j?.error?.message ?? null }), { headers: { "Content-Type": "application/json" } });
});
