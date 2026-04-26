## Premium Homepage Revamp

Replace the current symmetric/centered layout with a dynamic, asymmetric, motion-rich experience inspired by Linear, Stripe, and Apple. Remove fabricated info ("Live cohort starting next week"). Every section earns its place with movement, depth, and creative typography.

### Section-by-section redesign

**1. Hero — Asymmetric split with kinetic typography**
- Two-column layout (60/40 on desktop, stacked on mobile). Left: oversized kinetic headline. Right: animated 3D-tilt instructor collage.
- **Headline**: huge clamp(3rem, 8vw, 7rem) display type. Static line "The edge to" + rotating gradient word (typewriter kept, but bolder). Second line "your tech career." with the gold dot.
- **Replace fake "Live cohort" pill** with a real, honest trust pill: animated avatar stack ("Join 2,000+ learners building today") that links to /courses.
- **Right collage**: 4 floating instructor cards with parallax mouse-tilt (framer-motion `useMotionValue` + `useTransform` on mouseX/Y), each at different scales/rotations, with a soft purple glow ring rotating slowly behind them. Replaces the cloud-logo + tech-logo strips that currently sandwich the CTA.
- **Below-fold scroll cue**: animated mouse/chevron with vertical pulse.
- Background: existing gradient mesh + a subtle animated noise grain SVG overlay + slow-drifting orb (keep but reduce to one).

**2. Logo marquee — Refined**
- Keep the alumni marquee but: add edge fade masks (left/right), reduce logo size, double-row variant on desktop with one row reversing direction. Adds visual rhythm without clutter.

**3. Stats counter band — NEW**
- A thin full-bleed band right after the marquee with 4 animated counters (Students, Courses, Instructors, Countries). Pulled from real DB counts where possible; otherwise honest defaults. Each counter sits in a glass pill with a tiny line-chart sparkline animating in.

**4. "Why Silicon Edge" — Bento grid replacement**
- Replace the 4 equal cards with an **asymmetric bento layout** (5 tiles, mixed sizes):
  - Large feature tile: "Live, instructor-led" with mock chat-bubble animation cycling messages.
  - Medium tile: "Built for completion" with animated radial progress ring (0→92%).
  - Medium tile: "Hireable skills" with rotating skill chips.
  - Small tile: "Lifetime access" with playing video icon pulse.
  - Small tile: "Community" with an animated avatar group.
- All tiles share `glass-card` style, hover-lift, and a magnetic cursor-follow effect on the large one.

**5. Categories + Course rail — Polished**
- Keep horizontal scroll but: add edge fade gradients, replace the round chevron buttons with cleaner pill buttons that only appear on hover, and add an animated underline beneath the active category pill (framer-motion `layoutId`).

**6. How it works — Vertical scroll-driven timeline (replace 4-column row)**
- Sticky-scroll timeline: as the user scrolls, a vertical progress line fills (`useScroll` + `scaleY`), each step animates in alternately left/right with a number that morphs in. Feels cinematic vs. the current static 4-up grid.

**7. Instructors — Marquee-style hover reveal (replace static 4-up)**
- Horizontal scrolling card row (drag-to-scroll on mobile). Each card greyscales by default; on hover/focus, color returns, the card tilts 3°, and a hidden tagline slides up. Tap "View all instructors" → /instructors page.

**8. Mentors block — Keep but enhance**
- Keep the side-by-side layout. Replace the static `courseBanner` image with a layered composition: instructor portrait + floating UI card snippets (mock "Live class · 24 online", "Project graded · A+", "Job offer received"). Adds storytelling depth.

**9. Trust badges + Testimonials — Merge & redesign**
- Merge into a single "Loved by ambitious learners" section: trust badges become a thin chip row below a **masonry grid of testimonials** (3 columns, varied heights), not a marquee. Click any testimonial to expand. Marquee is overused; masonry feels editorial and premium.

**10. FAQ — Keep with polish**
- Add an icon next to each question, accordion chevron rotates 180° smoothly, expanded item gets a subtle gradient border using conic-gradient animation.

**11. Final CTA — Big finale**
- Full-bleed dark section with animated SVG grid floor (perspective grid receding to horizon, lines pulsing). Headline "Your edge starts now." Single primary CTA + "Talk to admissions" secondary link.

### Cross-cutting motion & polish
- Add a global **scroll progress bar** at top (1px primary gradient).
- Add a **noise grain SVG** overlay utility class for premium texture.
- Add **magnetic button** behavior to all primary CTAs (cursor pulls button slightly).
- Replace any remaining `rounded-xl` on hero/feature surfaces with `rounded-2xl` for softer premium feel.
- Use `prefers-reduced-motion` guard to disable heavy animations for accessibility.

### Technical notes
- All changes confined to `src/pages/Index.tsx` plus minor utilities in `src/index.css` (noise overlay, scroll-progress, perspective-grid keyframes, magnetic helper).
- Reuse existing framer-motion, Accordion, CourseCard. No new dependencies.
- Fetch real counts via Supabase (`profiles`, `courses`, `instructors` count queries) with fallback values; never hardcode misleading copy.
- Remove the dishonest "Live cohort starting next week · Limited seats" pill.
- Honor `useReducedMotion()` from framer-motion to skip parallax/tilt for users who prefer reduced motion.

### Files to modify
- `src/pages/Index.tsx` — full rewrite of section composition
- `src/index.css` — add `.noise-overlay`, `.perspective-grid`, `.magnetic-btn` helpers and `scroll-progress` keyframes

No DB schema changes, no new edge functions, no new packages.
