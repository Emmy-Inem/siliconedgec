

# Plan: Comprehensive LMS, Forms, Admin & Influencer Upgrades

## 1. Tutor LMS Comprehensive Setup (Categories, Tags, Learning Paths)

Pre-seed the database via migration with the **correct production data** so the LMS feels complete out-of-the-box. Admins can still edit everything from the UI.

**Categories to seed (matching real catalog):**
Cloud Engineering, DevOps, Software Engineering, AI / Machine Learning, Cybersecurity, Data Science, Web Development, Programming Languages, UI/UX Design, Free Webinars.

**Tags to seed:**
AWS, Azure, GCP, Kubernetes, Docker, Python, JavaScript, TypeScript, React, Angular, GraphQL, CSS, Gatsby, Node.js, Beginner-Friendly, Bootcamp, Hands-On Labs, Career-Ready, Certificate, Free.

**Learning Paths to seed (with course assignments):**
- **Cloud Engineer Track** → Cloud Engineering Accelerator, FREE Cloud Webinar, GraphQL intro
- **Full-Stack Web Developer Track** → JavaScript Getting Started, Modern JavaScript, CSS Ultimate, Angular, Gatsby JS
- **Python Developer Track** → The Python Course, GraphQL intro

Existing courses will be auto-mapped to their category by title keyword matching in the migration (best-effort; admins can re-assign).

---

## 2. Live Class Calendar View

New component **`LiveClassCalendar.tsx`** added to:
- Student `Dashboard.tsx` → "Calendar" tab showing all upcoming live classes across enrolled courses
- `AdminLiveClasses.tsx` → toggle between list view and calendar view

Built with a lightweight monthly grid (no heavy lib — pure Tailwind). Click a date → see classes that day with Join button.

---

## 3. Free Webinar "Register" Flow + Registration Form

**New table `course_registrations`** (separate from enrollments — captures lead-style data):
```
id, course_id, user_id (nullable for guest), full_name, email,
whatsapp_number, country, profession, experience_level,
how_did_you_hear, motivation, created_at
```
RLS: anyone can insert; admins can view/manage.

**Detection of free/webinar:** course is treated as a webinar when `price = 0` OR title starts with "FREE". For these courses:
- Course card and detail page show **"Register"** button instead of "Enroll" / "Add to Cart"
- Click opens new **`RegistrationFormModal.tsx`** asking: full name, email, WhatsApp number, country, profession, experience level, how they heard about us, motivation
- On submit → row written to `course_registrations`, an enrollment row also auto-created (so they get the same dashboard access), success toast

**For paid courses** — new **`EnrollmentDetailsModal.tsx`** appears AFTER successful payment (or on free-with-promo enroll) asking a shorter form: WhatsApp number, country, profession, goal. Stored in same `course_registrations` table with a `registration_type` field (`webinar` vs `enrollment`).

**Admin page `/admin/registrations`** — new sortable/filterable table of all registrations with:
- Filter by course, type (webinar/enrollment), date range
- Export to CSV
- Mark as "contacted" / "follow-up needed" with notes column
- Direct WhatsApp link (`wa.me/{number}`) for one-click outreach

---

## 4. Replace Wrong Phone Numbers Across Site

Audit and update every hardcoded number. Currently `+447741247592` appears in `Index.tsx` (WhatsApp banner), `Footer.tsx` fallback, `WhatsAppFAB.tsx`, etc. Action:

- Remove ALL hardcoded fallbacks; pull strictly from `site_content` table (`contact_phone`, `contact_whatsapp`).
- Seed `site_content` rows for `contact_phone`, `contact_whatsapp`, `contact_email`, `contact_address` with placeholders like `"UPDATE IN ADMIN SETTINGS"` so it's obvious they need configuration.
- Components display nothing (or a "Contact via email" fallback) when the value is the placeholder, preventing wrong numbers from leaking.
- Confirm `AdminSettings.tsx` exposes inputs for all four contact fields.

---

## 5. Conditional "Jobs" Nav Link

`Header.tsx` updated:
- New tiny hook `useHasPublishedJobs()` runs `supabase.from('jobs').select('id', {count:'exact', head:true}).eq('is_published', true)` (cached 5 min via React Query).
- Render the "Jobs" nav item only when `count > 0`.
- Same logic applied to mobile menu and `Footer.tsx` if Jobs link added there.

---

## 6. Role Management System Hardening

Verify and fix the full RBAC chain:

- Confirm `user_roles` table + `has_role()` function are correctly wired (already exist).
- `AdminUsers.tsx` already supports promote/demote — test for edge cases:
  - Self-demotion guard: prevent the only admin from demoting themselves.
  - Activity log entry on every role change (already wired via `logAdminActivity`).
- `RequireAdmin.tsx` re-verified to gate by `isAdmin` (admin OR moderator) using server-side `has_role()`, never localStorage.
- `admin-permissions.ts` `canAccessRoute()` enforced inside `AdminLayout.tsx` so moderators cannot navigate to admin-only routes by URL.
- New "Roles" badge column shown clearly in `AdminUsers.tsx` (already partially done).
- Add `/admin/registrations` to ADMIN_ONLY_ROUTES.

---

## 7. Custom Short Influencer Links

**New column** on `promo_codes`: `slug TEXT UNIQUE` (e.g. "tayo", "summer25").

**New public route** `/r/:slug` → `RedirectInfluencer.tsx`:
- Looks up `promo_codes.slug`
- Stores UTM params in localStorage via existing `useUtmTracking` (`utm_source = influencer_name`, `utm_campaign = code`, `utm_medium = influencer`)
- Auto-applies the promo code to checkout (stored in `sessionStorage.pending_promo`)
- Redirects to `/courses` (or `/courses/:id` if `?course=…` param provided)

**Admin UI** in `AdminInfluencerMarketing.tsx`:
- New "Custom Slug" input in the create/edit promo dialog (auto-suggests from influencer name, e.g. "tayo")
- Validation: lowercase, alphanumeric + hyphens, unique
- Detail dialog now shows TWO link options:
  1. **Short link**: `https://siliconedgec.com/r/tayo` ← primary, copy button
  2. Long UTM link (current) — collapsed under "Advanced"
- Optional `?course=<id>` selector to deep-link a short code to a specific course

`PaymentModal.tsx` updated to read `sessionStorage.pending_promo` and auto-apply on open.

---

## Files / Migrations Summary

**New migration:** seed categories/tags/learning_paths, create `course_registrations` table + RLS, add `slug` column to `promo_codes`, seed `site_content` contact placeholders.

**New components/pages:**
- `src/components/RegistrationFormModal.tsx`
- `src/components/EnrollmentDetailsModal.tsx`
- `src/components/LiveClassCalendar.tsx`
- `src/pages/RedirectInfluencer.tsx`
- `src/pages/admin/AdminRegistrations.tsx`
- `src/hooks/useHasPublishedJobs.ts`

**Modified:**
- `src/components/Header.tsx` (conditional Jobs link)
- `src/components/CourseCard.tsx` + `src/pages/CourseDetail.tsx` (Register vs Enroll button)
- `src/components/PaymentModal.tsx` (auto-apply pending promo, trigger details modal)
- `src/pages/Index.tsx`, `src/components/Footer.tsx`, `src/components/WhatsAppFAB.tsx` (remove hardcoded phone)
- `src/pages/admin/AdminInfluencerMarketing.tsx` (slug field + short link UI)
- `src/pages/admin/AdminLiveClasses.tsx` + `src/pages/Dashboard.tsx` (calendar view)
- `src/pages/admin/AdminSettings.tsx` (ensure all contact fields exposed)
- `src/App.tsx` (`/r/:slug` and `/admin/registrations` routes)
- `src/lib/admin-permissions.ts` (add new admin route)

