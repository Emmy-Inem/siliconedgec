# SEO Audit Report — Silicon Edge Consulting

**Website**: https://www.siliconedgec.com  
**Audit Date**: September 9, 2026  
**Framework**: React 18.3.1 (Vite 5.4.19 SPA)  
**Rendering**: Pure Client-Side Rendering (CSR)  
**Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)  
**Styling**: Tailwind CSS 3.4 + shadcn/ui (Radix primitives)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What's Already Good](#2-whats-already-good)
3. [Critical Issues](#3-critical-issues)
4. [High Priority Issues](#4-high-priority-issues)
5. [Medium Priority Issues](#5-medium-priority-issues)
6. [Low Priority Issues](#6-low-priority-issues)
7. [Technical SEO Infrastructure](#7-technical-seo-infrastructure)
8. [Content Architecture & Topical Clusters](#8-content-architecture--topical-clusters)
9. [On-Page SEO (Titles, Descriptions, Canonicals)](#9-on-page-seo-titles-descriptions-canonicals)
10. [Structured Data Audit](#10-structured-data-audit)
11. [Course Page SEO](#11-course-page-seo)
12. [Internal Linking Analysis](#12-internal-linking-analysis)
13. [Blog Architecture](#13-blog-architecture)
14. [Content Quality & E-E-A-T Signals](#14-content-quality--e-e-a-t-signals)
15. [Performance & Core Web Vitals](#15-performance--core-web-vitals)
16. [Image SEO](#16-image-seo)
17. [404/410 & Redirect Handling](#17-404410--redirect-handling)
18. [Open Graph & Social Sharing](#18-open-graph--social-sharing)
19. [Indexation Control](#19-indexation-control)
20. [URL Structure](#20-url-structure)
21. [Recommended Implementation Priority](#21-recommended-implementation-priority)

---

## 1. Executive Summary

Silicon Edge Consulting has built a feature-rich ed-tech platform with strong course content, well-structured JSON-LD on key pages, and a centralized `<SEO>` component that provides consistent metadata. However, several critical and high-priority SEO issues are undermining the site's ability to rank competitively.

**The top 5 most impactful findings:**

1. **Pure CSR with no pre-rendering** — The server delivers an empty `<div id="root"></div>`. While Googlebot can render JavaScript, this creates crawl budget inefficiency, delays indexing, and produces no content for social scrapers or non-JS crawlers.

2. **Soft 404s** — All non-existent URLs return HTTP 200 because the SPA serves `index.html` for every path. The `<meta httpEquiv="Status">` tag in `NotFound.tsx` is non-standard and ignored by crawlers.

3. **Siloed content architecture** — Courses and blog posts have zero cross-linking. Category pages (`/category/:slug`) are completely orphaned with no inbound links from any page, header, footer, or sitemap.

4. **Relative canonical URLs** — Multiple pages pass relative paths to the `<SEO>` component (e.g., `canonical="/testimonials"`), producing invalid `<link rel="canonical" href="/testimonials">` tags. Canonical and hreflang URLs must be absolute.

5. **~8.6 MB of unoptimized images** — Four stock instructor images imported eagerly into the homepage total ~6.7 MB of raw JPEG data. A 418 KB favicon loads on every page view.

**Overall SEO Maturity Score: 4/10** — Strong foundations (SEO component, structured data, consent mode) but critical gaps in rendering, internal linking, and technical infrastructure.

---

## 2. What's Already Good

These elements represent solid SEO foundations that should be preserved:

| Area | Strength | Reference |
|---|---|---|
| **Centralized SEO Component** | `SEO.tsx` provides consistent title, description, canonical, OG, Twitter, and JSON-LD injection across 43+ pages | [`SEO.tsx`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/components/SEO.tsx) |
| **Database-driven meta overrides** | `page_seo` table allows runtime SEO overrides without code deploys | [`SEO.tsx:L45-L53`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/components/SEO.tsx#L45-L53) |
| **Course page structured data** | `Course` schema with `BreadcrumbList`, `Offer`, `AggregateRating`, `CourseInstance` | [`CourseDetail.tsx:L492-L525`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/CourseDetail.tsx#L492-L525) |
| **Blog structured data** | `BlogPosting` schema with author, publisher, dates, and `mainEntityOfPage` | [`BlogPost.tsx:L72-L87`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/BlogPost.tsx#L72-L87) |
| **Organization/LocalBusiness schema** | Global `@graph` with 4 linked entities including `SearchAction` | [`index.html:L180-L237`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/index.html#L180-L237) |
| **FAQPage schema** | Implemented on Courses, ForBusinesses, FAQ, Trust, Pricing, and Affiliates pages | Multiple files |
| **JobPosting schema** | Full schema on individual job pages with salary, location, and employment type | [`JobDetail.tsx:L98-L130`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/JobDetail.tsx#L98-L130) |
| **UTM parameter stripping** | Canonical URLs automatically strip tracking params | [`SEO.tsx:L21-L29`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/components/SEO.tsx#L21-L29) |
| **Google Consent Mode v2** | Properly configured with denied-by-default ad storage | [`index.html:L22-L30`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/index.html#L22-L30) |
| **Google Site Verification** | Search Console ownership verified | [`index.html:L6`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/index.html#L6) |
| **Aggressive code splitting** | 60+ routes lazily loaded; only homepage is eager | [`App.tsx:L19-L110`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/App.tsx#L19-L110) |
| **UUID → slug redirect** | Course pages auto-redirect from UUID to clean slug URL | [`CourseDetail.tsx:L272-L278`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/CourseDetail.tsx#L272-L278) |
| **410 Gone support** | `gone_urls` Supabase table allows marking removed content as 410 | [`NotFound.tsx:L43-L49`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/NotFound.tsx#L43-L49) |
| **SPA pageview tracking** | Manual GA4 pageview dispatch on route changes | [`analytics.ts:L175-L180`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/lib/analytics.ts#L175-L180) |
| **Course listing ItemList** | Top 10 courses in `ItemList` structured data | [`Courses.tsx:L300-L307`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Courses.tsx#L300-L307) |

---

## 3. Critical Issues

Issues that are actively preventing proper indexing or causing significant SEO harm.

### 3.1 Pure CSR — No Pre-Rendered HTML Content
- **Impact**: Search crawlers see an empty `<div id="root"></div>` until JavaScript executes. While Googlebot renders JS, it uses a separate rendering queue that can delay indexing by days/weeks. Social media scrapers (Facebook, LinkedIn, Twitter) typically do NOT execute JS.
- **Evidence**: [`index.html:L249`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/index.html#L249) — `<div id="root"></div>`
- **No SSR/SSG plugins** installed in [`vite.config.ts`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/vite.config.ts)
- **Recommendation**: Implement a pre-rendering solution (e.g., `vite-plugin-prerender` for static top pages, or a Cloudflare Worker that serves pre-rendered HTML to bots). This is the single highest-impact change possible.

### 3.2 Soft 404 — HTTP 200 on All Missing URLs
- **Impact**: Google indexes "not found" pages as valid content, diluting crawl budget and potentially causing "Soft 404" warnings in Search Console.
- **Evidence**: The SPA serves `index.html` (HTTP 200) for every URL. `<meta httpEquiv="Status" content="404 Not Found">` at [`NotFound.tsx:L85`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/NotFound.tsx#L85) is non-standard and ignored by browsers and crawlers.
- **Recommendation**: Configure the hosting platform to return actual HTTP 404/410 status codes for unmatched routes, or use a CDN worker/edge function to detect and respond with proper status codes.

### 3.3 Static Sitemap Disconnected from Dynamic Content
- **Impact**: New courses, blog posts, and jobs published via Supabase admin are NOT reflected in the public sitemap. Google crawls stale data.
- **Evidence**:
  - [`public/sitemap.xml`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/public/sitemap.xml) — Static file with 71 hardcoded URLs and frozen `<lastmod>` dates.
  - [`supabase/functions/generate-sitemap/index.ts`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/supabase/functions/generate-sitemap/index.ts) — Dynamic generator exists but is NOT wired to the public path.
  - The dynamic generator uses UUIDs (`/courses/${c.id}`) instead of slugs, and omits blog posts and category pages entirely.
- **Recommendation**: Wire the Supabase edge function to serve at `/sitemap.xml`, fix URL generation to use slugs, add blog/category entries, and remove the static file.

### 3.4 Relative Canonical URLs on Multiple Pages
- **Impact**: Relative canonical URLs are invalid per Google's specification. They can cause canonicalization confusion and duplicate content issues.
- **Evidence**: Pages passing relative paths to `<SEO canonical={...}>`:
  - [`Testimonials.tsx:L53`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Testimonials.tsx#L53) — `canonical="/testimonials"`
  - [`Instructors.tsx:L37`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Instructors.tsx#L37) — `canonical="/instructors"`
  - [`Faq.tsx:L30`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Faq.tsx#L30) — `canonical="/faq"`
  - [`CategoryCourses.tsx:L55`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/CategoryCourses.tsx#L55) — `canonical={"/category/${slug}"}`
  - [`Search.tsx:L52`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Search.tsx#L52) — `canonical="/search"`
  - [`Bookmarks.tsx:L45`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Bookmarks.tsx#L45) — `canonical="/bookmarks"`
  - [`Refer.tsx:L42`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Refer.tsx#L42) — `canonical="/refer"`
  - [`Account.tsx:L64`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Account.tsx#L64) — `canonical="/account"`
  - [`OrderDetail.tsx:L53`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/OrderDetail.tsx#L53) — `canonical="/orders"`
  - [`NewsletterAction.tsx:L33`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/NewsletterAction.tsx#L33) — `canonical="/newsletter"`
- **Recommendation**: Fix `SEO.tsx` to always prepend `PRODUCTION_ORIGIN` when a relative path is passed as `canonical`. One-line fix in `SEO.tsx:L60-L62`.

### 3.5 `www` vs Non-`www` Canonical Conflict
- **Impact**: Legal pages emit canonicals on `https://www.siliconedgec.com` while the rest of the site uses `https://siliconedgec.com`. This creates domain-level canonical conflicts.
- **Evidence**: [`Legal.tsx:L177`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Legal.tsx#L177) — hardcodes `https://www.siliconedgec.com${pathname}`
- **Recommendation**: Change `Legal.tsx` to use `siteUrl(pathname)` from the site-url utility, which uses the non-www domain.

---

## 4. High Priority Issues

Issues that significantly limit ranking potential or cause indexing confusion.

### 4.1 No Fallback `<meta name="description">` in HTML Shell
- **Impact**: If Googlebot or any social scraper reads the raw HTML before JS executes, there is no description for snippet generation.
- **Evidence**: [`index.html`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/index.html) contains `<title>` but no `<meta name="description">`.
- **Recommendation**: Add a static fallback `<meta name="description">` in `index.html`.

### 4.2 Completely Orphaned Category Pages
- **Impact**: `/category/:slug` pages have ZERO inbound links from any page, navigation, or sitemap. Search engines cannot discover them.
- **Evidence**:
  - No `<Link to="/category/...">` in [`Header.tsx`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/components/Header.tsx), [`Footer.tsx`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/components/Footer.tsx), [`Courses.tsx`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Courses.tsx), or [`CourseDetail.tsx`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/CourseDetail.tsx).
  - Omitted from sitemap generator.
  - Uses incorrect DB column names (`difficulty_level`, `price_naira` vs actual `difficulty`, `price`), causing runtime data errors.
- **Recommendation**: Link category pages from header/footer navigation and course listing filters. Fix schema mismatch. Add to sitemap.

### 4.3 Blog ↔ Course Cross-Linking is Zero
- **Impact**: Blog articles about AWS, Cloud, DevOps topics have zero links to related courses. Course pages have zero links to relevant blog articles. This wastes topical authority and internal link equity.
- **Evidence**: See [Internal Linking Matrix](#12-internal-linking-analysis).
- **Recommendation**: Add "Related Courses" CTAs in blog posts and "Related Articles" section on course pages.

### 4.4 Course Detail Page Missing Related Courses
- **Impact**: Each course page is a dead-end with no cross-links to other courses. A `/courses/:id/related` route exists but is only linked from internal learning pages, not the public detail page.
- **Evidence**: [`CourseDetail.tsx`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/CourseDetail.tsx) contains zero links to other courses. The `upsell_course_ids` and `cross_sell_course_ids` DB columns exist but are unused on the public page.
- **Recommendation**: Add a "Related Courses" section at the bottom of `CourseDetail.tsx` using the existing `upsell_course_ids` / `cross_sell_course_ids` data.

### 4.5 Duplicate URL Paths in Sitemap
- **Impact**: Both top-level routes and `/p/` CMS routes are indexed for the same content, causing duplicate content signals.
- **Evidence**: `public/sitemap.xml` contains both:
  - `/about` AND `/p/about`
  - `/privacy` AND `/p/privacy`
  - `/refund-policy` AND `/p/refund`
  - `/terms` AND `/p/terms`
- **Recommendation**: Remove `/p/*` duplicates from sitemap. Add canonical tags on CMS pages pointing to their top-level equivalents.

### 4.6 Client-Side Redirects Instead of Server-Side
- **Impact**: All redirects (e.g., `/affiliates` → `/career`) execute as client-side React `<Navigate>`. Search engine bots see HTTP 200 with the SPA shell, not proper HTTP 301/308 redirect headers.
- **Evidence**: [`App.tsx:L162-L164`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/App.tsx#L162-L164) — `<Navigate to="/career" replace />`
- **Recommendation**: Add a `_redirects` file (Netlify/Cloudflare) or equivalent server config for permanent redirects.

### 4.7 Heading Hierarchy Violations
- **Impact**: Multiple pages skip heading levels (H1 → H3, missing H2), which hurts content structure signals.
- **Evidence**:
  - [`About.tsx`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/About.tsx): H1 → H3 → H2 (inverted)
  - [`Contact.tsx`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Contact.tsx): H1 → H3 (no H2 visible in default state)
  - [`ForBusinesses.tsx`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/ForBusinesses.tsx): H1 → H3 before first H2
  - [`CourseDetail.tsx`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/CourseDetail.tsx): H1 → H3 ("What You'll Learn") without enclosing H2
- **Recommendation**: Fix heading levels to maintain proper H1 → H2 → H3 nesting.

---

## 5. Medium Priority Issues

Issues that limit optimization but aren't actively harmful to indexing.

### 5.1 No `<link rel="preconnect">` Resource Hints
- **Evidence**: [`index.html`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/index.html) has zero preconnect tags for `fonts.googleapis.com`, `fonts.gstatic.com`, the Cloudflare R2 image CDN, or Supabase API.
- **Recommendation**: Add preconnect tags for critical origins.

### 5.2 Render-Blocking Font Loading via CSS @import
- **Evidence**: [`src/index.css:L1`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/index.css#L1) uses `@import url('https://fonts.googleapis.com/css2?...')` creating a 3-hop request waterfall.
- **Recommendation**: Move font loading to `<link rel="preload">` in `index.html`.

### 5.3 Overfetching Unused Font Families
- **Evidence**: `Playfair Display` and `Great Vibes` are loaded globally but only used in [`Certificates.tsx`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Certificates.tsx) for PDF generation.
- **Recommendation**: Load certificate fonts lazily only on the certificates page.

### 5.4 robots.txt Missing Disallows for Private Routes
- **Evidence**: [`public/robots.txt`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/public/robots.txt) omits: `/account`, `/orders/`, `/instructor/*`, `/bookmarks`, `/wishlist`, `/refer`, `/courses/*/learn`, `/courses/*/quizzes`, `/courses/*/assignments`, `/quizzes/*/attempts`, `/newsletter/*`.
- **Recommendation**: Add these routes to the `Disallow` section.

### 5.5 Duplicate `/bookmarks` and `/wishlist` Without Redirect
- **Evidence**: [`App.tsx:L197-L198`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/App.tsx#L197-L198) — Both paths render the same `<Bookmarks />` component.
- **Recommendation**: Redirect `/wishlist` to `/bookmarks` via `<Navigate>`.

### 5.6 Blog Not in Main Navigation
- **Evidence**: [`Header.tsx:L15-L22`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/components/Header.tsx#L15-L22) — Blog is absent from the primary navigation. Only appears in footer.
- **Recommendation**: Add Blog to the header navigation to increase crawl frequency and user discovery.

### 5.7 Blog Categories and Tags Are Non-Linkable
- **Evidence**: Categories in [`Blog.tsx:L91`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Blog.tsx#L91) and tags in [`BlogPost.tsx:L137`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/BlogPost.tsx#L137) are plain `<span>` elements, not links.
- **Recommendation**: Create blog category archive pages and make categories/tags clickable links.

### 5.8 Course Listing Lacks Pagination
- **Evidence**: [`useCourses.ts:L65-L80`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/hooks/useCourses.ts#L65-L80) — All courses load in a single query with no pagination.
- **Recommendation**: While the current course count may be manageable, add pagination or "load more" for scalability and crawlability.

### 5.9 Category Filter Doesn't Update URL
- **Evidence**: [`Courses.tsx:L188`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Courses.tsx#L188) — Category selection is local React state only. No query parameter or URL update.
- **Recommendation**: Update URL with `?category=...` on filter change to make filtered views shareable and crawlable.

### 5.10 Canonical on 404 Page Points to Homepage
- **Evidence**: [`NotFound.tsx:L87`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/NotFound.tsx#L87) — `<link rel="canonical" href="https://siliconedgec.com/" />`
- **Recommendation**: Remove canonical from 404/410 pages (they should have `noindex`).

### 5.11 No Vite Manual Chunking Configuration
- **Evidence**: [`vite.config.ts`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/vite.config.ts) has zero `build.rollupOptions.output.manualChunks` configuration. Heavy libraries (`recharts`, `jspdf`, `html2canvas`, `framer-motion`) may inflate the main vendor chunk.
- **Recommendation**: Configure manual chunks to isolate heavy admin-only libraries.

### 5.12 Missing BreadcrumbList on Most Pages
- **Evidence**: Only [`CourseDetail.tsx`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/CourseDetail.tsx#L495-L507) has `BreadcrumbList` structured data. Blog posts have visual breadcrumbs but no schema. No other pages have breadcrumb structured data.
- **Recommendation**: Add `BreadcrumbList` schema to all key public pages (blog posts, category pages, instructors, jobs, help articles).

---

## 6. Low Priority Issues

Enhancements for incremental SEO improvement.

### 6.1 No Bing/Yandex/Pinterest Verification
- Only Google verification exists. Add `msvalidate.01` for Bing Webmaster Tools.

### 6.2 `@types/qrcode` in Production Dependencies
- [`package.json:L51`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/package.json#L51) — Should be in `devDependencies`.

### 6.3 Redundant `HelmetProvider` Wrapping
- Both [`main.tsx:L22`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/main.tsx#L22) and [`App.tsx:L139`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/App.tsx#L139) wrap the app in `<HelmetProvider>`.

### 6.4 Duplicate `EducationalOrganization` Structured Data
- [`Index.tsx:L695-L701`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Index.tsx#L695-L701) duplicates the entity already in `index.html:L200-L207` without referencing the same `@id`.

### 6.5 Manifest Points to Placeholder Icon
- [`public/manifest.webmanifest:L9-L11`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/public/manifest.webmanifest#L9-L11) — Icon entry uses `placeholder.svg`.

### 6.6 Redundant robots.txt Directives
- Both `Disallow: /admin` and `Disallow: /admin/` are specified (the first already covers the second).

### 6.7 `og:type` is "article" on Course Pages
- [`CourseDetail.tsx:L490`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/CourseDetail.tsx#L490) sets `type: "article"`. Courses should use `type: "website"` or `type: "course"` (non-standard but acceptable).

### 6.8 Pages Without Any Title/Meta Tags
- `Cart.tsx`, `CourseLearning.tsx`, `Dashboard.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` — These inherit the fallback `index.html` title. While these are mostly private/authenticated pages, they should have unique titles for browser tab clarity.

---

## 7. Technical SEO Infrastructure

### 7.1 Rendering Architecture
| Aspect | Current State | Ideal |
|---|---|---|
| Rendering | CSR-only SPA | SSG for public pages + CSR for authenticated |
| HTML Shell | Empty `<div id="root">` | Pre-rendered HTML with content |
| Meta Tags | Injected via JS (react-helmet-async) | Static in HTML + JS enhancement |
| `<noscript>` Content | Only tracking pixels | Meaningful fallback content |

### 7.2 Hosting Platform
- Built with Lovable (hosted on Lovable cloud / Cloudflare Pages).
- No `_redirects`, `_headers`, or `vercel.json` platform config files exist.
- No CDN-level redirect or status code control files.

### 7.3 Search Console Readiness
- ✅ Google site verification present: `JwZAw3lwyTU59DX4Fzgaydldnxj8A-Vr2aXfkRT2C34`
- ❌ No Bing (`msvalidate.01`) verification
- ❌ Sitemap URL in robots.txt references static file, not dynamic generator

---

## 8. Content Architecture & Topical Clusters

### Current State
The site covers 10 primary commercial topic areas but lacks structured topical clustering:

| Topic Cluster | Hub Page | Supporting Content | Status |
|---|---|---|---|
| Cloud Engineering | `/courses` (filtered) | Individual courses | ⚠️ No dedicated hub |
| AWS | `/category/aws` (orphaned) | AWS courses | ❌ Orphaned |
| Azure | `/category/azure` (orphaned) | Azure courses | ❌ Orphaned |
| GCP | `/category/google-cloud` (orphaned) | GCP courses | ❌ Orphaned |
| DevOps | `/category/devops` (orphaned) | DevOps courses | ❌ Orphaned |
| Kubernetes | No category page | Courses only | ❌ Missing |
| AI/ML | `/category/ai-ml` (orphaned) | AI/ML courses | ❌ Orphaned |
| Cybersecurity | `/category/cybersecurity` (orphaned) | Courses | ❌ Orphaned |
| Data Engineering | `/category/data-engineering` (orphaned) | Courses | ❌ Orphaned |
| Corporate Training | `/for-businesses` | — | ✅ Has dedicated page |

### Recommendations
1. **De-orphan category pages** — Link from header dropdown, footer, course listing, and course detail pages.
2. **Create pillar content** for each topic cluster on the blog (e.g., "Complete Guide to AWS Certification in 2026").
3. **Internal link blog ↔ courses** within the same topic cluster.
4. **Add Learning Paths to navigation** — `/paths` exists but is barely linked.

---

## 9. On-Page SEO (Titles, Descriptions, Canonicals)

### 9.1 Title Tag Quality Assessment

**Good Patterns:**
- Homepage: `"Job-Ready AI, Cloud & DevOps Training | Silicon Edge Consulting"` — includes keywords + brand
- Course detail: `"${course.title} — Silicon Edge"` — dynamic, keyword-rich
- Blog post: Dynamic `meta_title` or `post.title` with brand suffix

**Issues:**
- Many titles are generic (e.g., `"My Account"`, `"Order Details"`, `"Help Center"`) without keyword context
- Title separator is inconsistent: some use `|`, others use `—`, others use `·`
- Course listing title `"Tech Courses & Bootcamps | Silicon Edge Consulting"` could be more keyword-targeted

### 9.2 Meta Description Coverage
- **43 pages** use `<SEO>` component with descriptions ✅
- **6 pages** have no description at all (Cart, CourseLearning, Dashboard, ForgotPassword, ResetPassword, RedirectInfluencer)
- `index.html` has no static fallback `<meta name="description">`
- Default description in `SEO.tsx:L15` is well-written: *"Master AI, Cloud, DevOps and more with live, instructor-led training programs. Job-ready skills from industry veterans."*

### 9.3 Canonical URL Issues Summary
| Issue | Pages Affected | Fix Effort |
|---|---|---|
| Relative canonical paths | 10+ pages | Low — fix in `SEO.tsx` |
| `www` vs non-`www` conflict | Legal pages (4) | Low — change Legal.tsx |
| Canonical on 404 page → homepage | NotFound.tsx | Low — remove canonical |
| `/bookmarks` + `/wishlist` duplicate | 2 routes | Low — add redirect |

---

## 10. Structured Data Audit

### 10.1 Current Coverage
| Schema Type | Page(s) | Quality |
|---|---|---|
| `Organization` | `index.html` (global) | ✅ Good |
| `EducationalOrganization` | `index.html` (global) + `Index.tsx` (duplicate) | ⚠️ Duplicate entity |
| `WebSite` with `SearchAction` | `index.html` (global) | ✅ Good |
| `LocalBusiness` | `index.html` (global) | ✅ Good |
| `Course` with `Offer`, `AggregateRating` | `CourseDetail.tsx` | ✅ Good |
| `BreadcrumbList` | `CourseDetail.tsx` only | ⚠️ Missing on most pages |
| `ItemList` | `Courses.tsx` | ✅ Good |
| `FAQPage` | 6 pages | ✅ Good |
| `BlogPosting` | `BlogPost.tsx` | ✅ Good |
| `Blog` | `Blog.tsx` | ✅ Good |
| `ContactPage` | `Contact.tsx` | ✅ Good |
| `AboutPage` | `About.tsx` | ✅ Good |
| `JobPosting` | `JobDetail.tsx` | ✅ Good |

### 10.2 Missing Structured Data
| Recommended Schema | Target Page | Priority |
|---|---|---|
| `BreadcrumbList` | BlogPost, CategoryCourses, InstructorDetail, JobDetail, HelpArticle, LearningPathDetail | HIGH |
| `Course` enhancements (`prerequisites`, `syllabusSections`) | CourseDetail | MEDIUM |
| `Review` (individual reviews) | CourseDetail | MEDIUM |
| `Person` (instructor profiles) | InstructorDetail | MEDIUM |
| `HowTo` or `LearningResource` | LearningPaths | LOW |
| `VideoObject` | Course pages with video | LOW |

---

## 11. Course Page SEO

### 11.1 Content Sections Present
- ✅ Title (H1), description, metadata pills (duration, enrolled, rating, difficulty)
- ✅ Curriculum tab with modules and lessons
- ✅ Description tab with "What You'll Learn" outcomes
- ✅ Reviews section with student comments and ratings
- ✅ Sidebar with price, CTAs, instructor card
- ✅ "What's included" feature list

### 11.2 Content Sections Missing
- ❌ **Prerequisites section** — No dedicated area for prerequisite skills/knowledge
- ❌ **Course FAQ section** — `COURSE_FAQS` exist on the listing page but NOT on individual course pages
- ❌ **Target audience ("Who this course is for")** — No section exists
- ❌ **Related courses** — Zero cross-links to other courses
- ❌ **Related blog articles** — Zero links to blog content
- ❌ **Downloadable syllabus** — No PDF/printable syllabus option

### 11.3 Course Schema Enhancements Needed
- Add `teaches` property (what skills are taught)
- Add `prerequisite` field
- Add `duration` in ISO 8601 format
- Add `inLanguage` property
- Add `numberOfCredits` if applicable

---

## 12. Internal Linking Analysis

### 12.1 Internal Linking Matrix

| Source → Destination | Courses | Blog | Categories | Instructors | Learning Paths |
|---|---|---|---|---|---|
| **Header nav** | ✅ `/courses` | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing |
| **Footer** | ✅ `/courses` | ✅ `/blog` | ❌ Missing | ✅ `/instructors` | ✅ `/paths` |
| **CourseDetail** | ❌ No related courses | ❌ No blog links | ❌ Category is plain text | ✅ Instructor card link | ❌ |
| **Courses listing** | ✅ Course cards | ❌ | ❌ Filter is local state | ❌ | ❌ |
| **Blog listing** | ❌ | ✅ Post cards | ❌ Category is `<span>` | ❌ | ❌ |
| **BlogPost** | ❌ No course CTAs | ✅ Related posts | ❌ | ❌ | ❌ |
| **CategoryCourses** | ✅ Course cards, "Browse all" | ❌ | ❌ No cross-category | ❌ | ❌ |
| **Sitemap generator** | ⚠️ Uses UUIDs | ❌ Omitted | ❌ Omitted | ✅ | ❌ |

### 12.2 Key Orphan Pages
These pages have fewer than 2 inbound links from site navigation:
- `/category/:slug` — 0 inbound links
- `/paths` — Only in footer
- `/paths/:id` — No navigation entry
- `/help` — Only in footer under "Legal & Support"
- `/search` — Only accessible via search form submission
- `/cohorts` — Only accessible when authenticated

---

## 13. Blog Architecture

### 13.1 Current State
- ✅ Blog listing with cards, categories, dates, authors
- ✅ Individual posts with markdown rendering (`react-markdown` + `remark-gfm`)
- ✅ Related posts section (by `related_post_ids` or fallback by category)
- ✅ Blog schema (`Blog` type on listing, `BlogPosting` on individual posts)
- ✅ Meta title/description DB fields for custom SEO on posts
- ✅ Reading time display

### 13.2 Issues
- ❌ Blog not in main header navigation
- ❌ Category and tag elements are non-clickable `<span>` badges
- ❌ No blog category archive pages exist
- ❌ No tag archive pages exist
- ❌ No blog search or filtering
- ❌ No author profile pages (just plain text names)
- ❌ Zero course CTAs or links in blog content
- ❌ Blog omitted from dynamic sitemap generator
- ❌ Author is text-only — no link to instructor profile even when same person

---

## 14. Content Quality & E-E-A-T Signals

### 14.1 E-E-A-T Strengths
- ✅ Named instructors with bios and avatars
- ✅ Instructor detail pages (`/instructors/:id`)
- ✅ Student reviews with real names
- ✅ London business address in LocalBusiness schema
- ✅ Phone number (+44) in structured data
- ✅ Trust page (`/trust`) with security and data practices

### 14.2 E-E-A-T Gaps
- ❌ Blog author names don't link to author/instructor profiles
- ❌ No author bio shown on blog posts
- ❌ No "Last updated" date visible on course pages
- ❌ No external trust signals (e.g., partner logos linked to partner sites)
- ❌ No review aggregation on the Courses listing page
- ❌ No case studies or success stories with detailed outcomes

---

## 15. Performance & Core Web Vitals

### 15.1 LCP Risks
| Risk | Details | Impact |
|---|---|---|
| **Hero images with `loading="lazy"`** | [`Index.tsx:L259, L810`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/pages/Index.tsx#L259) — Above-fold images defer loading | HIGH — Directly degrades LCP |
| **~6.7 MB stock images in homepage bundle** | 4 fallback instructor images imported eagerly via `import` statements | HIGH — Blocks initial paint |
| **418 KB favicon** | [`public/favicon.png`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/public/favicon.png) loaded on every page | MEDIUM |
| **CSS @import font waterfall** | 3-hop chain: HTML → CSS → Google Fonts CSS → font files | MEDIUM |

### 15.2 CLS Risks
| Risk | Details |
|---|---|
| Missing `width`/`height` on images | Almost all images lack HTML dimension attributes |
| Header logo | [`Header.tsx:L92-L96`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/components/Header.tsx#L92-L96) — No explicit dimensions |
| `SafeImage` component | [`SafeImage.tsx:L17-L26`](file:///c:/Users/ADMIN/.gemini/antigravity/scratch/siliconedgec/src/components/SafeImage.tsx#L17-L26) — Does not enforce dimensions |

### 15.3 TBT Risks
- 5 third-party tracking scripts load simultaneously in `<head>`: GA4, Google Ads, TikTok Pixel, Meta Pixel (2 IDs), LinkedIn Insight Tag
- Heavy JS libraries in production bundle: `recharts` (~400KB), `jspdf` (~450KB), `html2canvas` (~200KB), `framer-motion` (~160KB)

---

## 16. Image SEO

### 16.1 Alt Text Quality
- ✅ Generally good alt text on editorial images (descriptive, contextual)
- ✅ Proper `alt="" aria-hidden` on decorative images
- ⚠️ `SafeImage` defaults to `alt=""` when not provided — should require explicit alt text
- ❌ Admin and some internal images have empty alt without aria-hidden

### 16.2 Image Optimization
- ❌ No WebP/AVIF format serving
- ❌ No image CDN resize/transform URLs
- ❌ Stock images are raw JPEGs (1-2 MB each)
- ❌ No `<picture>` element with `srcSet` for responsive images
- ❌ Missing `width`/`height` attributes on almost all images

### 16.3 Favicon Issues
- 418 KB PNG is excessive (should be <10 KB)
- No multi-resolution favicon set (`favicon.ico`, `apple-touch-icon-180x180.png`, etc.)
- Manifest references `placeholder.svg`

---

## 17. 404/410 & Redirect Handling

### 17.1 Current 404/410 Implementation
- ✅ Visual 404 page with search and navigation
- ✅ `gone_urls` table for 410 handling
- ✅ `noindex, nofollow, noarchive` meta robots on error pages
- ❌ HTTP 200 status code returned (soft 404)
- ❌ Invalid `<meta httpEquiv="Status">` tag
- ❌ Canonical pointing to homepage on 404 page

### 17.2 Redirect Inventory
| From | To | Type | Issue |
|---|---|---|---|
| `/affiliates` | `/career` | Client-side `<Navigate>` | Should be HTTP 301 |
| `/affiliate` | `/career/dashboard` | Client-side `<Navigate>` | Should be HTTP 301 |
| `/admin/bootcamps` | `/admin/commerce?tab=bootcamps` | Client-side | OK (admin, noindex) |
| 25+ legacy admin routes | Hub routes with tabs | Client-side | OK (admin, noindex) |
| `/courses/:uuid` | `/courses/:slug` | Client-side `navigate()` | Should be HTTP 301 |

---

## 18. Open Graph & Social Sharing

### 18.1 Current Coverage
- ✅ Global OG fallbacks in `index.html` (type, image, site_name, locale)
- ✅ Per-page OG via `SEO.tsx` (title, description, image, url)
- ✅ Twitter card with `summary_large_image`
- ✅ Default OG image on Cloudflare R2

### 18.2 Issues
- ⚠️ Since this is a CSR SPA, social scrapers that don't execute JS will only see the static fallback tags from `index.html`, not per-page titles/descriptions
- ⚠️ `og:title`, `og:description`, and `og:url` are deliberately omitted from `index.html` to avoid duplication — but this means social scrapers see NO title/description
- ⚠️ `twitter:site` defined in `index.html` but not re-emitted in `SEO.tsx`

---

## 19. Indexation Control

### 19.1 robots.txt Review
**Currently Disallowed:**
`/admin`, `/dashboard`, `/api`, `/cart`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-receipt/`, `/r/`, tracking query params

**Should Also Disallow:**
`/account`, `/orders/`, `/instructor/*`, `/bookmarks`, `/wishlist`, `/refer`, `/courses/*/learn`, `/courses/*/quizzes`, `/courses/*/assignments`, `/quizzes/*/attempts`, `/newsletter/*`, `/cohorts/*`, `/support`, `/support/*`

### 19.2 noindex Implementation
- ✅ `NotFound.tsx` — `noindex, nofollow, noarchive`
- ✅ `ErrorPage.tsx` — `noindex, nofollow`
- ✅ `SEO.tsx` supports `no_index` override from `page_seo` table
- ❌ Search page (`/search`) — should be noindex (thin, duplicate content)
- ❌ Newsletter action pages — should be noindex

---

## 20. URL Structure

### 20.1 Current URL Patterns
| Pattern | Example | Quality |
|---|---|---|
| Homepage | `/` | ✅ |
| Course listing | `/courses` | ✅ |
| Course detail | `/courses/cloud-engineering-accelerator-4-week-hands-on-bootcamp` | ✅ Descriptive slug |
| Blog listing | `/blog` | ✅ |
| Blog post | `/blog/ai-skills-nigeria-2026` | ✅ Descriptive slug |
| Category | `/category/aws` | ✅ Clean |
| Instructor | `/instructors/123-uuid` | ⚠️ UUID-based |
| Job detail | `/jobs/456-uuid` | ⚠️ UUID-based |
| Learning path | `/paths/789-uuid` | ⚠️ UUID-based |
| Legal | `/terms`, `/privacy` | ✅ Clean |
| CMS pages | `/p/about` | ⚠️ Duplicates `/about` |

### 20.2 URL Issues
- Instructor, job, and learning path detail pages use UUIDs instead of slugs
- `/p/*` CMS routes duplicate top-level routes
- `/career` route hosts affiliate/partner program (semantic mismatch with URL)

---

## 21. Recommended Implementation Priority

### Phase A — Quick Wins (1-2 days, HIGH impact, LOW risk)
1. Fix `SEO.tsx` to always resolve canonical URLs to absolute paths
2. Fix `Legal.tsx` www canonical conflict
3. Remove canonical from `NotFound.tsx`
4. Add static `<meta name="description">` to `index.html`
5. Add `<link rel="preconnect">` tags to `index.html`
6. Add missing robots.txt disallow rules
7. Fix heading hierarchy on About, Contact, ForBusinesses, CourseDetail
8. Remove duplicate EducationalOrganization from Index.tsx
9. Redirect `/wishlist` to `/bookmarks`
10. Add static `og:title` and `og:description` fallbacks to `index.html`

### Phase B — Content Architecture (2-3 days, HIGH impact, MEDIUM risk)
1. De-orphan category pages (link from header, footer, course listing, sitemap)
2. Fix CategoryCourses.tsx schema mismatch (`difficulty_level` → `difficulty`, `price_naira` → `price`)
3. Add "Related Courses" section to CourseDetail.tsx
4. Add blog → course cross-linking CTAs in BlogPost.tsx
5. Add Blog to header navigation
6. Make blog categories and tags clickable links
7. Add BreadcrumbList schema to blog posts, category pages, jobs, help articles
8. Add course → blog "Related Articles" section

### Phase C — Technical Infrastructure (3-5 days, CRITICAL impact, MEDIUM risk)
1. Wire dynamic sitemap generator to serve at `/sitemap.xml` (fix to use slugs, add blog/category entries)
2. Create `_redirects` or equivalent server config for HTTP 301 redirects
3. Investigate pre-rendering solution for top public pages
4. Configure Vite manual chunking for heavy libraries
5. Optimize and compress stock images, convert to WebP
6. Optimize favicon (compress to <10KB, add favicon.ico)
7. Move font loading from CSS @import to HTML `<link rel="preload">`

### Phase D — Content Quality & E-E-A-T (2-3 days, MEDIUM impact, LOW risk)
1. Add author bios to blog posts (link to instructor profiles)
2. Add course FAQ section to CourseDetail.tsx
3. Add prerequisites section to CourseDetail.tsx
4. Add "Who this course is for" section to CourseDetail.tsx
5. Add "Last updated" date to course pages
6. Enhance Course schema with `teaches`, `prerequisite`, `inLanguage`

### Phase E — Performance & Polish (1-2 days, MEDIUM impact, LOW risk)
1. Remove `loading="lazy"` from above-fold hero images
2. Add explicit `width`/`height` to key images
3. Lazy-load certificate fonts only on `/certificates`
4. Add `noindex` to `/search` and `/newsletter/*` pages
5. Add Bing site verification

---

*This audit was produced by inspecting the full codebase. No destructive changes have been made. All recommendations are designed to preserve existing functionality while improving search engine visibility.*
