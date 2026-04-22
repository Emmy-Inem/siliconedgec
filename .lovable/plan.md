

## Plan: Home Page CMS, Animated Icons, Cart/Bookmark Drilldown & Templates Polish

### 1. Email Templates page — finish it properly
File: `src/pages/admin/AdminEmailTemplates.tsx`

The page already loads from `site_content` and upserts on the unique `key` column, so saves persist. Three real gaps to close:

- **Loading state for the row fetch**: replace silent empty state with skeletons so admins know data is being pulled.
- **HTML-rendered preview that matches what is actually sent**. Today the preview is a `<pre>` of the raw body. I will switch it to an `<iframe srcDoc=...>` rendering the same HTML wrapper used by `supabase/functions/send-email/index.ts` (dark card, purple CTA), so what you see is what subscribers receive.
- **Status feedback**: show a "Saved 12s ago" timestamp pulled from the row's `updated_at` after a successful save, plus toast on validation errors (empty subject/body).
- **Reset to defaults** button per template (re-applies the `defaults` constant) so you can roll back a bad edit.
- Confirm the **5 default keys** (`tpl_welcome`, `tpl_enrollment`, `tpl_certificate`, `tpl_reset`, `tpl_cart_recovery`) seed-on-first-save. They already do.

### 2. Customers with Cart / Bookmarks — make users visible
Two places improved so you can drill down:

**a. New "Customers" table inside `AdminCartAbandonment.tsx`** (current page only groups by user but doesn't link out). Each row gets:
- Click-through to a new modal showing the user's full cart contents, email (joined from `auth.users` via the `profiles` table), signup date, and any prior orders.
- Quick "View user" link that navigates to `/admin/user-activity?user=<id>` (existing page) for the full activity timeline.

**b. `AdminWishlistInsights.tsx`** gains the same row click → modal with all the user's bookmarks + enrollment status side-by-side, so you immediately see who is "bookmarking but not buying".

**c. Add email column to both tables** by joining with `profiles.full_name` and a new tiny `useUserEmails` helper that pulls emails through an admin-only RPC (we already use the same pattern in `AdminStudents`). If the project doesn't have that RPC, fall back to displaying `full_name` and a "Copy user ID" button.

### 3. Home page CMS — give you full control of `Index.tsx`
The hero, stats, value props, instructor list, and testimonials are all hard-coded today. I will:

- **Add 12 new keys** to `site_content` (all `text` type, seeded with current copy so nothing visually changes until you edit):
  - `home_hero_eyebrow`, `home_hero_title_static`, `home_hero_subtitle`, `home_hero_cta_primary`, `home_hero_cta_secondary`
  - `home_typewriter_words` (comma-separated list)
  - `home_why_eyebrow`, `home_why_title`, `home_why_description`
  - `home_categories_eyebrow`, `home_categories_title`, `home_categories_description`
  - `home_whatsapp_banner_title`, `home_whatsapp_banner_subtitle`, `home_whatsapp_banner_url`
- **New hook** `src/hooks/useHomeContent.ts` that fetches all `home_*` keys in one query and returns a typed object with safe fallbacks (so the page never breaks if a key is missing).
- **Refactor `Index.tsx`** to read every text/button label/typewriter list from this hook.
- **New admin page `AdminHomeContent.tsx`** at `/admin/home-content`, grouped into sections (Hero, Why Us, Categories, WhatsApp Banner) with one input/textarea per key, a per-section "Save" button, and a live preview link to `/`. Sidebar entry under **Content** group.

This means you can change every headline, subtitle, and CTA on the home page without code edits.

### 4. Animated icons on the home page (premium feel)
Update `Index.tsx`:

- **Cloud provider + tech logos** already use `motion.div` with `whileHover`. Add a continuous floating `animate={{ y: [0, -6, 0] }}` loop with staggered delays so they gently bob even at rest.
- **"Why Learn" 4 feature icons** (`BookOpen`, `Award`, `Briefcase`, `Zap`): wrap each in a `motion.div` with `animate={{ rotate: [0, -6, 6, 0] }}` on a 4s loop, paused on hover; add a subtle pulsing ring (`box-shadow` keyframes) using a new `animate-icon-pulse` class in `src/index.css`.
- **Stat icons** (Users, Award, etc.) get a slow `scale: [1, 1.05, 1]` breathe animation.
- All animations use `prefers-reduced-motion` guard via Framer Motion's built-in respect for the OS setting (we add the CSS class behind a `@media (prefers-reduced-motion: no-preference)` block).
- No new dependencies — Framer Motion is already in the project.

### 5. Wiring & permissions
- `App.tsx` adds the `/admin/home-content` route.
- `admin-permissions.ts` adds `/admin/home-content` to `ADMIN_ONLY_ROUTES`.
- `AdminSidebar.tsx` adds **"Home Page Content"** under the **Content** section with the `Home` icon from lucide.

### Technical notes
- One DB seed migration inserts the 15 new `home_*` keys with `ON CONFLICT (key) DO NOTHING` so re-runs are safe.
- No schema changes — `site_content` already has the unique key constraint and `content_type` field we need.
- Email Templates preview iframe is sandboxed (`sandbox=""`) so HTML in the body cannot execute scripts.
- Cart/Wishlist drilldown reuses existing queries (`profiles`, `enrollments`, `orders`); no new tables.
- All animations are GPU-accelerated transforms; no layout thrash.

### Files touched
- New: `src/hooks/useHomeContent.ts`, `src/pages/admin/AdminHomeContent.tsx`, one DB migration for seed keys.
- Modified: `src/pages/Index.tsx`, `src/pages/admin/AdminEmailTemplates.tsx`, `src/pages/admin/AdminCartAbandonment.tsx`, `src/pages/admin/AdminWishlistInsights.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/lib/admin-permissions.ts`, `src/App.tsx`, `src/index.css`.

