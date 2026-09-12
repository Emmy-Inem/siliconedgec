# Replace Nigeria-focused blog content with UK-focused articles

## Goal
Make the blog consistently represent Silicon Edge Consulting as a UK technology-training organisation, replace Nigeria-specific articles, and use credible real stock photography throughout the blog.

## Changes
- Audit every published blog post and identify Nigeria-specific titles, slugs, copy, tags, keywords, metadata, and internal links.
- Replace the Nigeria-focused posts with useful UK search-intent articles covering cloud computing courses, Azure training, DevOps, AI skills, tech careers, and employer-led upskilling.
- Position Silicon Edge Consulting as a leading UK training provider through evidence-led language and clear differentiators, without publishing an unverifiable “number one” factual claim.
- Replace clearly synthetic or broken blog imagery with the prepared real stock photographs and give every article a relevant image.
- Update old Nigeria-specific URLs in the sitemap and AI-readable site guide so only the new UK articles are promoted.
- Preserve existing article IDs where practical so the replacement is atomic and avoids duplicate content.

## Content quality and search requirements
- Use UK spelling, terminology, audience context, and search phrases.
- Give each article a unique title, excerpt, meta title, meta description, tags, and keywords.
- Include practical tables, checklists, direct answers, and relevant links to courses, bootcamps, learning paths, and business training.
- Keep claims verifiable; do not invent accreditations, rankings, learner outcomes, offices, testimonials, or statistics.
- Retain Article and breadcrumb structured data already supplied by the article page.

## Technical details
- Apply one database migration that updates/removes all Nigeria-focused records and publishes the UK replacements with stock-image URLs.
- Update `public/sitemap.xml` without fabricated `lastmod` dates and update `public/llms.txt` to match.
- Verify the blog index and article pages on desktop and mobile, then confirm metadata, headings, images, links, and the project build.
