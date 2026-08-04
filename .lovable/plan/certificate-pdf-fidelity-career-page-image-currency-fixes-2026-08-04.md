# Certificate PDF fidelity + Career page image & currency fixes

## 1. Downloaded certificate looks nothing like the on-page sample

Problems visible in the marked-up PDF:
- All content is squeezed into the top third, leaving a large empty gap in the middle.
- The gold "VERIFIED" seal renders flat/garbled — the radial gradient, inset shadow and icon don't survive the html2canvas rasterisation.
- The instructor signature is clipped on the right ("Fauziyah Zak…").

Fixes:
- Give the print variant its own vertical rhythm instead of relying on a single `mb-auto` spacer inside the A4-ratio box: distribute header / body / footer with explicit spacing so the middle band fills the same way the on-screen sample does.
- Scale print typography and spacing proportionally to the fixed 1400px render width (header, student name, course title, badge row, footer) so the PDF is a 1:1 match of the preview rather than desktop-sized text floating in a taller box.
- Rebuild the seal for rasterisation: replace the CSS radial-gradient + box-shadow + icon with an inline SVG badge (gold rings, dashed inner ring, award mark, "VERIFIED" as SVG text). SVG rasterises reliably in html2canvas.
- Widen the signature cell and reduce the signature font size in print mode so long names fit inside the stroke, keeping the underline aligned to the block.
- Re-render and visually compare the exported PDF against the on-page sample, iterating until they match.

## 2. Career page image below the hero

The image is cropped with `object-top`, so only the tops of the team's heads show. Switch the crop to centre framing (and a slightly taller mobile ratio if needed) so the laptop they're looking at is in frame.

## 3. Naira on the career page

The earnings estimator formats through the localized-price hook, which correctly resolves to Naira for Nigerian visitors. Since the partner program targets an international audience, the career page will format all money in USD unconditionally (converted from the underlying NGN figures at the live rate), independent of visitor location.

## Technical notes
- `src/pages/Certificates.tsx` — `BrandedCertificate` print branch, `SignatureMark`, new SVG seal component.
- `src/pages/Affiliates.tsx` — hero image classes; estimator switched to a fixed-USD formatter.
- No database or backend changes.