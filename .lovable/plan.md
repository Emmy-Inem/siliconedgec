## Goal

Polish the homepage hero (cleaner, more like the quso.ai reference), tighten the header, localize course pricing by visitor country, gate certificate downloads behind course completion, replace AI-generated imagery with professional stock photos, and wire community/lifetime CTAs to real destinations.

---

## 1. Hero section refresh (Index.tsx)

- Remove the dotted SVG radial connector lines from `FloatingTechLogos` (the "lines on the hero").
- Lighten the background — reduce purple radial intensity (lower opacity stops) and remove the bottom purple gradient band so it reads as a clean white canvas with only a soft top-center hue, matching the reference image.
- Keep the floating tech logos but space them further toward the edges (avoid crowding the headline area), shrink mid-area logos, and ensure they don't appear behind the CTA stack.
- **Center brand mark**: replace the "SE" gradient square with the actual Silicon Edge favicon (`/public/favicon.png`) inside the white rounded card.
- **Mobile hero layout**:
  - Reduce hero top/bottom padding on mobile (`pt-24 pb-14`).
  - Smaller headline clamp floor (`clamp(1.85rem, 8vw, 4.75rem)`).
  - Show a *condensed* version of floating logos on mobile (4–6 logos, smaller, edges only) instead of `hidden md:block` — keeps the premium feel without clutter.
  - Tighten social-proof pill spacing on small screens.

## 2. Header refresh (Header.tsx)

- Add a soft white border + subtle shadow even when transparent over hero pages, so the header is always visible: when `!scrolled && isHeroPage`, use `bg-white/70 backdrop-blur-md border-b border-white/60 shadow-sm`.
- Make nav links bolder and clearer: bump from `text-[13px] font-medium` to `text-sm font-semibold`, and over hero pages use `text-foreground/80 hover:text-primary` (drop the muted hero-muted color now that the header has a white background).
- Active route gets a primary-color text with a small underline.

## 3. Location-based currency for course prices

New utility `src/lib/currency.ts`:
- Detect visitor country via `Intl.DateTimeFormat().resolvedOptions().timeZone` mapped to country (lightweight, no network) plus `navigator.language` as fallback.
- If country is NG → display Naira (₦, no conversion).
- Otherwise convert from NGN to the local currency using a static FX table for major currencies (USD, EUR, GBP, CAD, GHS, KES, ZAR, INR, AUD) with a daily-cached rate fetched from a free endpoint (`https://open.er-api.com/v6/latest/NGN`) via React Query (24 h staleTime). Fallback to bundled rates if the request fails.
- Format using `Intl.NumberFormat(locale, { style: "currency", currency })`.

New hook `useLocalizedPrice(amountNgn)` returning `{ formatted, currency, isNgn }`.

Refactor every public-facing price display to go through this hook (admin/order/receipt screens stay in Naira since those are the merchant's books):
- `src/components/CourseCard.tsx`
- `src/pages/CourseDetail.tsx`
- `src/pages/Pricing.tsx`
- `src/pages/Cart.tsx` (display only — checkout still charges NGN via Paystack with a small "Charged in ₦X,XXX" note)
- `src/pages/Jobs.tsx`, `src/pages/JobDetail.tsx` (salary ranges)

## 4. Replace circular selection indicator with underline

In the courses category pill row (Index.tsx line ~941–957), drop the `motion.span` pill background. Instead render text-only buttons with a `motion.span layoutId="cat-underline"` — a 2px primary underline that animates between active items. Apply the same pattern anywhere else circular selectors are used in public pages (verify Courses.tsx filters too).

## 5. Wire CTAs to real destinations

Use `useSiteSettings().whatsapp_community_url` (already exists in DB):
- "Meet them all" link in the instructors section (line 1053) → opens WhatsApp community URL in new tab.
- "Community" bento card (line 893) → wrap `AvatarStackTile` content in an anchor to the WhatsApp community URL.
- "Lifetime" bento card (line 902) → make the whole card link to `/courses` (lifetime access ties to enrolled courses).

Fallback: if `whatsapp_community_url` is empty, link defaults to `/contact` and admin can fill it in Site Settings.

## 6. Fix broken alumni logos (Index.tsx line 774–793)

Replace the unreliable Wikipedia URLs with stable Simple Icons CDN equivalents:
- Meta → `https://cdn.simpleicons.org/meta/0668E1`
- Andela → use a working hosted SVG or replace with another reputable employer (Spotify, Uber, Stripe).
- Flutterwave → `https://cdn.simpleicons.org/flutterwave/F5A623`.
- Add an `onError` handler that hides any logo that still fails so we never render a broken image icon.

## 7. Certificates page (Certificates.tsx)

- **Gate the download button**: in `CertificateCardWithDownload` and the sample preview, only show the download button if `cert.completion_status === 'completed'` (or whatever flag exists on the certificates row — check schema; if not present, key off the existence of a real DB row, since certs are auto-issued only on completion). For the sample card shown to non-completers, replace the download button with a disabled "Complete a course to download" tooltip + lock icon.
- **More realistic sample certificate**: redesign `BrandedCertificate` / `CertificateForPDF`:
  - Use the actual Silicon Edge logo at higher resolution.
  - Add a signature line with an instructor name + signature image.
  - Add a subtle watermark seal in the background.
  - Use deeper navy + gold accent colors consistent with brand.
  - Include "Hours of training", "Skills covered" pill row, and a serial number in monospaced font.
- **Replace AI hero image**: swap `certificate-celebration.jpg` (AI-generated) with a professional Unsplash stock image of a graduate holding a certificate (download a CC0 image, save to `src/assets/certificate-graduate.jpg`).

## 8. Replace AI imagery on the home page

Swap the following AI-generated assets with curated Unsplash stock photos (free, attribution-free) — download to `src/assets/`:
- `instructor-1.jpg` … `instructor-4.jpg` → 4 professional headshot stock photos (diverse, business casual).
- `mentor` image (referenced via `home.mentor_image` fallback `instructor1`) → a stock photo of a mentor reviewing code on a laptop with a student.
- `hero-team.jpg`, `student-learning.jpg`, `business-training.jpg` → professional stock equivalents.

Will fetch via `curl` from Unsplash source URLs (e.g. `https://images.unsplash.com/photo-XXXX?w=800`) at build time and commit to `src/assets/`.

## 9. Technical notes

- New file: `src/lib/currency.ts` (timezone→country map for ~30 countries, FX fallback table).
- New file: `src/hooks/useLocalizedPrice.ts`.
- Edit `src/lib/format-currency.ts` to add `formatLocalized(amountNgn, currency, rate, locale)`.
- All currency conversions are display-only; orders/receipts/Paystack stay in NGN. Add a small "(charged in ₦)" hint near non-Naira prices on CourseDetail and Cart.
- Header changes apply to *all* `darkHeroPages` (Home, Pricing, Certificates, For Businesses).
- No DB migrations needed — `whatsapp_community_url` already exists in `site_content`.

---

## Files to change

- `src/pages/Index.tsx` (hero + alumni logos + category pills + CTA links + AI image swaps)
- `src/components/Header.tsx` (border, bolder nav)
- `src/pages/Certificates.tsx` (gate download, redesign sample, swap hero image)
- `src/components/CourseCard.tsx`, `src/pages/CourseDetail.tsx`, `src/pages/Pricing.tsx`, `src/pages/Cart.tsx`, `src/pages/Jobs.tsx`, `src/pages/JobDetail.tsx` (localized prices)
- `src/lib/currency.ts`, `src/lib/format-currency.ts`, `src/hooks/useLocalizedPrice.ts` (new helpers)
- `src/assets/*` (replace AI imagery with stock photos via curl)
