

# Plan: Homepage Animation Fixes + Backend/Admin Feature Audit

## Part 1: Homepage Typewriter — Add More Courses & Fix Animation

**Current issue:** The typewriter only cycles through 4 terms: "Cloud Engineering", "Software Engineering", "Artificial Intelligence", "Web Development". The blinking cursor uses a class `animate-typewriter-blink` that may not be defined, causing a broken animation.

**Changes to `src/pages/Index.tsx`:**
- Expand `typewriterWords` array to include: "Cloud Engineering", "Software Engineering", "Artificial Intelligence", "Web Development", "Cybersecurity", "Data Science", "DevOps", "Product Design", "UI/UX Design"
- Fix the cursor blink — replace the `animate-typewriter-blink` class with a proper Tailwind animation or inline style using `animate-pulse` or a custom keyframe
- Ensure the typewriter text has a minimum height so the layout doesn't jump between words of different lengths

**Changes to `tailwind.config.ts`:**
- Add `typewriter-blink` keyframe if missing (alternating opacity 0/1 at 500ms interval)

---

## Part 2: Missing Backend, Admin & Business Features Audit

Here is a comprehensive list of what's missing or incomplete before the platform is production-ready:

### A. Payment Processing (CRITICAL — Not Functional)
- **No edge functions exist** for Paystack or Stripe integration
- `PaymentModal.tsx` collects card details client-side but has no backend to process payments
- No payment verification, webhook handling, or order/receipt storage
- **Action needed:** Create Paystack edge function, payment verification flow, and `orders` table

### B. Business/Corporate Features (Partially Missing)
- The `/for-businesses` form doesn't actually submit data anywhere — `onSubmit` just calls `e.preventDefault()`
- No `business_leads` table to store corporate inquiries
- No admin view for managing business lead submissions
- **Action needed:** Create `business_leads` table, wire up form submission, add admin page for viewing leads

### C. Email System (Not Functional)
- `AdminEmail.tsx` exists but no edge function to actually send emails
- No transactional email setup (welcome emails, enrollment confirmations, password resets)
- **Action needed:** Create email-sending edge function, configure email templates

### D. Course Content Delivery
- No video/content hosting or playback — lessons have `content_url` but no player component
- No lesson viewer page where students consume course materials
- Students can see enrolled courses in Dashboard but can't actually take them
- **Action needed:** Create `/courses/:id/learn` route with lesson viewer, video player, and progress tracking

### E. Certificate Generation
- `Certificates.tsx` page exists but certificates are not generated from actual course completion data
- No PDF generation for certificates
- **Action needed:** Create certificate generation (edge function or client-side PDF), link to enrollment completion

### F. File/Resource Management
- `course-thumbnails` storage bucket exists but no general course resources/materials storage
- No way to upload/download course materials (PDFs, slides, assignments)
- **Action needed:** Create `course-resources` storage bucket, admin upload UI, student download UI

### G. Admin Features Still Incomplete
1. **AdminOverview dashboard** — should show real metrics (revenue, active students, recent enrollments) from DB
2. **AdminAnalytics** — should pull real enrollment/revenue data, not mock data
3. **Notification system** — `NotificationBell.tsx` exists but notifications aren't created by any triggers
4. **Bulk operations** — no bulk delete/update in admin tables
5. **Admin search** — no global search across admin sections

### H. Authentication Gaps
- Google OAuth is referenced in architecture but may not be configured
- No "Forgot Password" flow completion (reset page after email link)
- No email verification enforcement check

### I. Real-time Features Missing
- No real-time notifications for new enrollments, Q&A posts
- No live class scheduling/integration (mentioned in business features)
- `supabase_realtime` not enabled on any tables

### J. SEO & Performance
- No meta tags/Open Graph tags on pages
- No sitemap generation
- No lazy loading for route-level code splitting

---

## What This Plan Will Implement Now

Only **Part 1** (typewriter fix + more courses) will be implemented in this round. The audit above is provided for your awareness and prioritization.

### Files to Modify
- `src/pages/Index.tsx` — expand typewriter words, fix cursor blink animation
- `tailwind.config.ts` — add `typewriter-blink` keyframe if missing

