

## Fix UTM Tracking After Signup/Login + Testimonial Visibility

### Problems

1. **UTM redirects are lost after auth.** When a visitor lands via `/r/emmanuel?course=ai-engineering`, `RedirectInfluencer` sends them to `/courses/ai-engineering`, but if they click "Create free account" in the signup prompt, they go to `/sign-up`, then after submission `SignUp` redirects to `/sign-in`, and `SignIn` redirects to `/`. The original course destination is gone.
2. **Testimonial cards on `/pricing` are unreadable.** The "We build tech careers" section uses a dark `bg-hero` background, but `.glass-card` is `hsl(var(--card) / 0.6)` — in light mode `--card` is white, so cards become a washed-out pale grey, and `text-hero-muted` (already light) becomes invisible against it.

---

### Fix 1 — Preserve intended destination through signup/login

**a) `RedirectInfluencer.tsx`** — before navigating to the destination, also stash it:
```ts
sessionStorage.setItem("sec_post_auth_redirect", url.pathname + url.search);
```

**b) `InfluencerSignupPrompt.tsx`** — when the user clicks "Create free account" or "I already have an account", pass the stored destination as a `?redirect=` query param so it survives the auth pages:
```tsx
<Link to={`/sign-up?redirect=${encodeURIComponent(dest)}`}>…</Link>
<Link to={`/sign-in?redirect=${encodeURIComponent(dest)}`}>…</Link>
```
Read `dest` from `sessionStorage.getItem("sec_post_auth_redirect")` (fallback to current location).

**c) `SignUp.tsx`** — read `?redirect=` from the URL. After successful signup:
- If a session is created immediately (auto-confirm on / OAuth), navigate to the redirect path.
- Otherwise (email confirmation required), pass it forward: `navigate("/sign-in?redirect=" + encodeURIComponent(redirect))` and also set `emailRedirectTo: ${origin}${redirect}` so the email confirmation link returns the user to the course page.
- For Google OAuth: `redirect_uri: ${origin}${redirect}`.

**d) `SignIn.tsx`** — read `?redirect=` from URL (or fall back to `sessionStorage.getItem("sec_post_auth_redirect")`). Replace `navigate("/")` with `navigate(redirect || "/")`. Same for Google OAuth `redirect_uri`. Clear the sessionStorage key on success.

**e) `AuthContext.tsx`** — on `SIGNED_IN` event, if `sec_post_auth_redirect` exists in sessionStorage AND we are currently on `/`, `/sign-in`, or `/sign-up`, navigate to the stored path and clear it. This catches the OAuth callback case where the user lands on `/` from Google's redirect.

**f) UTM persistence is already 30-day localStorage** (`useUtmTracking` / `sec_utm_params`), so attribution itself survives signup. Only the *destination path* was being lost — that's what (a)–(e) fix.

---

### Fix 2 — Make testimonial cards readable on dark `bg-hero`

In `src/pages/Pricing.tsx` testimonials section (lines ~281–316), replace `glass-card border-border` with an explicitly dark, semi-opaque card style that pairs with `bg-hero`:

```tsx
className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 space-y-4 hover:border-primary/40 hover:bg-white/[0.07] transition-all"
```

And bump quote contrast: change `text-hero-muted` on the quote to `text-hero/90`, keep name as `text-hero`, role as `text-hero-muted`. This guarantees light text on a properly dark translucent panel regardless of the global theme class.

---

### Verification flow (after implementation)

1. Open `/r/emmanuel?course=<course-slug>` in an incognito window → lands on the course page → signup prompt appears.
2. Click "Create free account" → URL becomes `/sign-up?redirect=%2Fcourses%2F<slug>...`.
3. Complete signup (or Google) → user ends up back on the original course page, not `/`.
4. Repeat for "I already have an account" → sign-in flow.
5. Visit `/pricing` and confirm the two testimonial cards (Sarah K., David C.) show readable text.

### Files touched

- `src/pages/RedirectInfluencer.tsx` — stash post-auth destination
- `src/components/InfluencerSignupPrompt.tsx` — pass `?redirect=` to auth links
- `src/pages/SignUp.tsx` — honor `?redirect=` for navigation, OAuth, email confirm
- `src/pages/SignIn.tsx` — honor `?redirect=` for navigation and OAuth
- `src/contexts/AuthContext.tsx` — post-`SIGNED_IN` redirect fallback for OAuth
- `src/pages/Pricing.tsx` — dark-friendly testimonial card styling

### Other features check

I'll spot-check after implementing: header/footer render, course catalog loads, cart works, admin routes still gated. No other changes planned unless issues surface during the fix.

