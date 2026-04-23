

## Plan: Polish the Free Webinar Flow End-to-End

### 1. Better post-registration confirmation modal (`RegistrationFormModal.tsx`)
The current success screen still says "Register for {courseTitle}" in the header even after the user has registered. Fix:

- Change the `DialogTitle` to render contextually:
  - Before submit: `"Register for {courseTitle}"`
  - After submit: `"You're in!"`
- Replace the success body copy with:
  - Headline: **"You're confirmed for {courseTitle} 🎉"**
  - Sub-line: **"We've sent the joining link and reminder details to your email and WhatsApp. Add it to your calendar so you don't miss it."**
- Add a secondary "View in Dashboard" button under the WhatsApp CTA that closes the modal and navigates to `/dashboard`.
- Hard-code the WhatsApp community URL fallback to the new link the user supplied: `https://chat.whatsapp.com/Fk8RN2yDKS800vnIG8K98X?mode=gi_t` (still preferring `settings.whatsapp_community_url` if admin sets one).
- Also update the WhatsApp link in the dashboard webinar card (see step 3) and seed the new link into `site_content.whatsapp_community_url` via a data update so the admin-managed value is correct out of the box.

### 2. "Registered" state on the course detail CTA (`CourseDetail.tsx`)
For free/webinar courses, when `isEnrolled` is true (the registration auto-creates an enrollment with `payment_status='free'`), show a disabled-style green button labelled **"✓ Registered"** with a sub-link "View in Dashboard", instead of "Register for Free". The non-enrolled state stays "Register for Free".

### 3. Surface webinars on the Dashboard (`Dashboard.tsx`)
- In the "My Courses" tab, render a new section **"Upcoming Webinars"** above "In Progress" that filters enrollments where the course price is 0 OR `payment_status === 'free'`. Each card shows:
  - Course title + date (pulled from the soonest matching `live_classes.scheduled_at` if any)
  - "Join WhatsApp Community" button → uses the same WhatsApp URL
  - "Open Course" → `/courses/:id`
- Add `price` and `payment_status` to the existing enrollments query so we can filter without an extra round-trip.

### 4. Pin the free webinar to the top of the catalog & home page
- **Add a sort helper** in `useCourses.ts` (or inline in both consumers) so the returned list is ordered: webinars first (`price === 0` OR title starts with "FREE"), then by `created_at desc`. Centralising it keeps `Index.tsx` and `Courses.tsx` consistent.
- **Home page (`Index.tsx`)**: the horizontal `filteredCourses` strip will now show the webinar first naturally. Also add a small **"Free webinar"** ribbon on `CourseCard` when `isWebinar` so it visually stands out at the top.
- **Catalog page (`Courses.tsx`)**: same sort order applies because both pages share `useCourses`.

### 5. Misc polish items I'm catching while in here
- `CourseCard.tsx`: the price label `"Free · Register"` is fine, but add the new `Free webinar` badge on the thumbnail (top-left) so it's visible from the catalog at a glance.
- Replace the silently-ignored 4th call to `useAuth` in the modal — currently `user.email` populates but if the user signs in mid-registration the form value becomes stale. Re-sync `email` from `user` only on first open via a small `useEffect`.
- Sitewide: ensure `webinar_registration` activity is also written when an existing enrollment is detected (currently we skip the insert silently). I'll guard the duplicate enrollment insert with `.onConflict` or a `select` first so a re-registration doesn't error out and the success modal still shows.

### Files touched
- `src/components/RegistrationFormModal.tsx` — new copy, dashboard CTA, hard-coded WA fallback, duplicate-safe enrollment.
- `src/pages/CourseDetail.tsx` — "Registered" state for free courses.
- `src/pages/Dashboard.tsx` — Upcoming Webinars section, expanded enrollments query.
- `src/hooks/useCourses.ts` — webinar-first sort.
- `src/components/CourseCard.tsx` — "Free webinar" ribbon.
- One data update on `site_content` to set `whatsapp_community_url` to the new link.

No schema migrations needed — all the columns and tables already exist.

