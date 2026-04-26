## Scope

Five connected changes:

1. Replace the favicon with the uploaded purple logo.
2. Rebrand every purple in the site to **#b13bff** (HSL `276 100% 62%`).
3. Add a **Backups** section in Admin → System → Login & Security, with weekly automated backups saved to Google Drive.
4. Remove the **"Join our WhatsApp Community"** banner from the homepage (FAB on other pages stays unless told otherwise).
5. Revamp the homepage to look more premium, creative, professional, and trustworthy.

---

## 1. Favicon

- Copy `user-uploads://Untitled_design_20260426_111136_0000.png` → `public/favicon.png`.
- Delete `public/favicon.ico` (browsers default to `/favicon.ico` and would override).
- Update `index.html`: `<link rel="icon" href="/favicon.png" type="image/png">` and add `apple-touch-icon` for mobile.

## 2. Purple → #b13bff (one source of truth, then sweep hardcoded values)

`#b13bff` ≈ HSL `276 100% 62%`. Update design tokens in `src/index.css`:


| Token                                                     | Current       | New            |
| --------------------------------------------------------- | ------------- | -------------- |
| `--primary` (light)                                       | `262 83% 58%` | `276 100% 62%` |
| `--accent` (light)                                        | `262 90% 65%` | `282 100% 68%` |
| `--ring` / `--sidebar-primary` / `--sidebar-ring` (light) | `262 83% 58%` | `276 100% 62%` |
| `--secondary-foreground` / `--sidebar-accent-foreground`  | `262 47% 20%` | `276 60% 22%`  |
| `--purple-glow`                                           | `262 90% 68%` | `282 100% 70%` |
| Dark variants of all of the above                         | `262 …%`      | `276/282 …%`   |


Then sweep hardcoded purples (Tailwind classes + raw hex/HSL strings) in:

- `src/pages/Index.tsx` (radial-gradient hsl(262 …))
- `src/pages/Pricing.tsx` (radial-gradient hsl(262 …))
- `src/pages/Certificates.tsx` (`#7c3aed` corner accents and signature color → `#b13bff`)
- `src/pages/admin/AdminEmailTemplates.tsx` (`#a855f7` CTA → `#b13bff`)
- `src/pages/admin/AdminAnalytics.tsx`, `AdminOverview.tsx`, `AdminMarketingAnalytics.tsx` (chart strokes/fills `hsl(262, 83%, 58%)` → `hsl(276, 100%, 62%)`)
- `src/pages/admin/AdminRegistrations.tsx`, `AdminBusinessLeads.tsx`, `AdminLeadsHub.tsx`, `Dashboard.tsx` (`bg-purple-500/*`, `text-purple-*`, `border-purple-500/*` Tailwind utilities → `bg-primary/*`, `text-primary`, `border-primary/*` so they pick up the new brand color automatically)

Since 99% of UI uses `hsl(var(--primary))`/`bg-primary`, the token change alone propagates the rebrand to every page. The sweep above catches the remaining hardcoded escapes.

## 3. Backups (Admin → System → Login & Security)

Add a new **"Backups"** card at the bottom of `AdminLoginSecurity.tsx`:

- Status row: "Last backup: &nbsp;", "Next backup: &nbsp;", green/red dot.
- "Run backup now" button (calls edge function on demand).
- Toggle: "Weekly automatic backups" (default ON, runs every Sunday 02:00 UTC via cron).
- List of recent backups (last 12) with: timestamp, size, "Open in Drive" link, "Restore instructions" (download JSON).

### How the backup works

- New edge function `supabase/functions/backup-to-drive/index.ts`:
  - Runs `pg_dump`-style export by selecting from every public table (snapshot all rows as JSON), bundles them into one file `siliconedge-backup-YYYY-MM-DD.json.gz`.
  - Uploads to Google Drive via the `google_drive` connector gateway into a `Silicon Edge Backups` folder (created if missing).
  - Inserts a row in a new `site_backups` table: `{ id, created_at, drive_file_id, drive_file_url, size_bytes, status, error }`.
- New table `site_backups` (admin-only RLS via `has_role('admin')`).
- New cron via `pg_cron` + `pg_net`: weekly call to the edge function on Sunday 02:00 UTC.
- Connector requirement: this requires a **Google Drive connection** linked to the project. The plan will trigger `standard_connectors--connect` for `google_drive` during implementation; if the user declines, the manual "Run backup now" button still works once they connect later.

### Honest limitation

This backs up **database rows**, not auth users, storage files, or edge function code. We will surface that clearly in the UI ("Database snapshot only — Lovable's git history covers code; storage files are not included in v1"). Restoring requires running a provided edge function with the backup JSON — we'll add a **"Restore from backup"** action that re-imports a selected backup (admin confirmation required).

## 4. Remove WhatsApp Community banner

Delete the entire `{/* WhatsApp Community Banner */}` section in `src/pages/Index.tsx` (lines 326–351). The floating WhatsApp FAB on other pages and the admin-managed `whatsapp_banner_*` site settings stay intact (just unused on home).

## 5. Homepage revamp — premium, creative, trustworthy

Goals: instant credibility, modern motion, social proof above the fold, less generic SaaS, more "elite training brand."

### Section-by-section changes (`src/pages/Index.tsx`)

1. **Hero (replaces current)**
  - Two-column on desktop (60/40): left = headline + CTA + trust row; right = animated 3D-tilt collage (instructor photos + mini course-card + live "Class starting in 12m" pill + animated certificate preview). On mobile, stacks.
  - New trust row directly under CTA: "Trusted by alumni at" + monochrome logo strip (Google, Microsoft, AWS, Meta, Andela, Flutterwave). Replaces the floating tech-icon row.
  - Live stat ticker chip: "● 1,247 students learning right now" (animated pulse).
  - Keep typewriter but tighten: 3 words max, smaller min-height to remove the empty-space gap.
2. **Logo marquee strip** (new, full-width, dark band) — partner/employer logos, infinite marquee using existing `marquee` keyframe.
3. **Outcomes / Why** — convert current 3-card grid into a **bento layout** (1 large + 4 small tiles) with subtle gradient borders, glass-card surfaces, and lucide icons inside gradient orbs. Each tile shows a metric (e.g., "92% job placement", "₦4.2M avg salary jump", "1:8 mentor ratio").
4. **Featured courses carousel** — keep the horizontal scroller but add: category pill filters with active-state glow, "View all" link, and a faux-3D depth effect on hover (perspective + translateZ).
5. **How it works** (new) — 4-step numbered timeline with icons (Apply → Learn live → Build projects → Get hired). Vertical on mobile, horizontal connector line on desktop.
6. **Instructors** — upgrade cards: portrait photo, name + role, mini-rating, "View profile" CTA, and a hover lift with glow ring. Pull from DB.
7. **Live testimonials wall** — masonry layout (2–3 cols) with star ratings, avatar, role, optional company logo. Add a featured "Video testimonial" card (placeholder play button) for hero social proof.
8. **Trust strip** (new, between testimonials and CTA): 5 horizontal badges — "Verified Certificates · ISO-style", "Money-back guarantee (7 days)", "Industry mentors", "Live + recorded", "Job-ready projects". Lucide icons, subtle glass cards.
9. **FAQ accordion** (new) — 6 common pre-purchase questions to handle objections (Is this for beginners? Do I need a degree? What if I miss a class? Do you help with jobs? etc.). Uses existing `accordion` shadcn component.
10. **Final CTA banner** — gradient background using new `--primary`/`--accent`, big headline + dual CTA + "No credit card required" microcopy.

### Visual polish (cross-section)

- Replace generic `bg-primary/5` accents with `bg-gradient-to-br from-primary/8 via-transparent to-accent/8`.
- Add `noise` SVG overlay (very low opacity) to hero + final CTA for premium texture.
- Standardize card radius (`rounded-2xl`), use `glass-card` consistently.
- All section headings: small uppercase eyebrow + headline + 1-line subhead pattern (already used in some sections — apply everywhere).

### Animation discipline

- One scroll-reveal pattern (existing `sectionReveal`) used everywhere — no new ad-hoc variants.
- Respect `prefers-reduced-motion` (already partially honored in CSS — extend to framer-motion via `useReducedMotion`).

---

## Files touched

- `index.html`, `public/favicon.png` (new), `public/favicon.ico` (deleted)
- `src/index.css` (token rebrand)
- `src/pages/Index.tsx` (WhatsApp removal + full revamp)
- `src/pages/Pricing.tsx`, `src/pages/Certificates.tsx`, `src/pages/Dashboard.tsx`
- `src/pages/admin/AdminEmailTemplates.tsx`, `AdminAnalytics.tsx`, `AdminOverview.tsx`, `AdminMarketingAnalytics.tsx`, `AdminRegistrations.tsx`, `AdminBusinessLeads.tsx`, `AdminLeadsHub.tsx`
- `src/pages/admin/AdminLoginSecurity.tsx` (Backups card)
- `supabase/functions/backup-to-drive/index.ts` (new)
- New migration: `site_backups` table + RLS + weekly `pg_cron` schedule

## What I need from you (during implementation)

- I'll trigger the Google Drive connector picker — pick the Drive account where backups should land (or let me know if you'd rather skip Drive and store backups in Lovable Cloud storage instead). This is the google drive folder that i want the weekly backup to: [https://drive.google.com/drive/folders/1UnS7V-Keds6fEHr0YO1dnzuo-5Lqok59?usp=sharing](https://drive.google.com/drive/folders/1UnS7V-Keds6fEHr0YO1dnzuo-5Lqok59?usp=sharing) 