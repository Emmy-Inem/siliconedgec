# Certificate Fidelity and Cross-Role Completion Plan

## Goal

Make the downloaded certificate pixel-consistent with the displayed certificate, then close the verified learner, instructor, partner, and admin integration gaps without treating normal empty states as bugs.

## 1. Make certificate preview and PDF use one canonical render

- Replace the separate responsive preview and `print`-modified export renders with one fixed 900 × 637 certificate canvas shared by both paths.
- Remove the duplicate, unused download implementation so certificate changes cannot diverge between two exporters.
- Remove PDF-sensitive layout features from the certificate itself:
  - use explicit width/height instead of CSS `aspect-ratio`;
  - replace Grid/Flex `gap` positioning in the title, achievement row, signature, seal, QR, and metadata areas with fixed tracks and explicit spacing;
  - use fixed icon boxes and locally defined SVG marks so icon/text baselines cannot drift;
  - keep the title text mathematically centered, with equal fixed-length rules positioned independently on both sides.
- Make the signature, seal, QR, borders, watermark, typography, and footer dimensions identical in preview and export; no `print`-only sizing differences.
- Before capture, explicitly wait for the logo, QR/SVG content, and the exact certificate fonts to load and decode instead of relying on a timer.
- Capture only the canonical certificate surface, excluding the decorative webpage shadow that is clipped by the canvas boundary.
- Preserve real learner name, course, instructor, issue date, verification URL, and certificate ID.

## 2. Verify certificate fidelity as a visual regression

- Download a real authenticated certificate through the UI.
- Render the PDF to an image and compare it with a same-size screenshot of the canonical preview.
- Check title-rule centering, all three achievement icons, name underline, signature baseline, seal/QR alignment, borders, watermark, and bottom metadata strip.
- Repeat at desktop and mobile viewport widths to prove viewport size no longer changes the PDF.
- Fix every visible mismatch and rerun the comparison before considering the certificate complete.

## 3. Complete the verified instructor workflow gaps

- Replace the instructor Quizzes page’s link into the admin area with an instructor-native course-scoped quiz list and builder, using the existing manual question/option authoring and publish controls.
- Expose the already-built Instructor Assist feature inside the instructor workspace, scoped to the instructor’s active cohort/course; admins retain access through the assessment hub.
- Add discoverable role-aware navigation to the instructor dashboard for instructor accounts.
- Keep instructor access server-authorized through existing role and course ownership checks; do not broaden instructor access to unrelated admin tabs.

## 4. Complete verified learner continuity

- Persist AI mock-interview sessions, scores, strengths, improvements, and timestamps so learners can revisit prior results instead of losing them when the dialog closes.
- Add a learner history view and a course/cohort-scoped staff view where authorized instructors/admins can review results.
- Retain legitimate empty states such as “No content uploaded yet” and “Curriculum coming soon”; these correctly reflect missing course content and are not application stubs.

## 5. Complete verified Career partner workflows

- Add a self-service payout request action based on available approved commission, the minimum payout threshold, and saved payout details.
- Store requested payouts as pending records; prevent duplicate requests from spending the same available balance.
- Add clear pending/approved/paid/rejected states and surface admin notes/reference information to the partner.
- Keep actual disbursement admin-controlled for now; no provider transfer integration will be invented without an approved provider account and transfer requirements.
- Add role-aware navigation to the Career dashboard for approved partners.

## 6. Repair admin and schema integration gaps

- Add Instructor Assist to the Assessments hub for admins.
- Refresh the generated database type definitions so actively used tables such as partner course selections, finance records, lesson unlocks, notifications, redirects, and role permissions no longer require unsafe `any` access.
- Replace affected `any` casts with generated table types and handle query errors explicitly.
- Add tab-level permission metadata to consolidated admin hubs so granting access to a hub does not silently expose every tab inside it.
- Preserve the existing LMS Sync Health panel and extend its checks only where the new mock-interview or payout records require admin visibility.

## 7. Backend security and data integrity

- Add migrations for mock-interview history and payout requests with explicit grants, RLS, indexes, timestamps, and ownership/staff policies.
- Use server-side functions for payout availability calculation and request creation so partners cannot alter balances, statuses, or paid references from the browser.
- Keep roles in `user_roles`; no client-stored or profile-based authorization.
- Run targeted database/security checks for only the new and modified flows, then verify learner, instructor, partner, and admin access boundaries end-to-end.

## Validation

- Certificate: authenticated preview/download visual comparison on desktop and mobile, plus one-page PDF dimensions and text/image inspection.
- Learner: save a mock interview, reopen history, and confirm unauthorized users cannot read another learner’s report.
- Instructor: create a manual quiz with options, attach it to a lesson, publish it, and confirm it appears only in the owned course.
- Partner: request an eligible payout, block duplicate/over-limit requests, and confirm admin status updates appear in the partner dashboard.
- Admin: verify Instructor Assist, tab permissions, typed queries, and LMS pages continue to load without console or request errors.

## Explicitly out of scope

- A public “apply to become an instructor” workflow is not treated as a defect because the current product uses admin-assigned instructor roles.
- Automated bank transfer execution is not added until a payout provider and operational approval flow are specified.