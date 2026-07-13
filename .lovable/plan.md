## Plan

1. **Fix both mobile menus for real devices**
   - Replace fragile click/touch handlers with pointer-based dismiss handling for the site header menu and admin sidebar.
   - Make overlays fixed, full-screen, and reliably above page content but below the menu panel.
   - Add explicit close behavior for X buttons, outside tap, Escape key, route changes, and viewport changes.
   - Prevent event bubbling from the open panel so tapping inside does not immediately close it.

2. **Fix lesson assignment indicators and mobile lesson access**
   - Keep lesson names clean: no `+ assignment` text anywhere.
   - Add a reusable assignment status dot component with semantic colors:
     - Purple glow = lesson has at least one visible assignment still pending.
     - Grey glow = lesson has visible assignment(s) and all have been submitted.
   - Add the same indicators to the mobile lesson/navigation experience, not desktop-only.
   - Refresh assignment status after submitting or updating an assignment so the dot changes without needing a full page reload.

3. **Make assignment submission more robust**
   - Improve `AssignmentPanel` error handling so failed assignment loads, uploads, inserts, or updates show clear feedback instead of silently failing.
   - Add a completion callback so the parent lesson page can update the assignment dot when a student submits.
   - Preserve the existing submit/update/upload flow and grading lock behavior.

4. **Close current security gaps in the backend**
   - Tighten bootcamp enrollment read access by removing email-claim-only access, so students can read records only when linked to their authenticated user id; admins/moderators keep full access.
   - Tighten `cohort_materials` read access so instructors only read materials for cohorts they teach, instead of any instructor reading all cohort materials.
   - Review storage policies for the private `cohort-materials` bucket and scope instructor write/update/delete to the cohort id in the object path where possible; admins/moderators stay unrestricted.
   - Re-run the security scan and mark resolved findings as fixed.

5. **Verify LMS/admin/mobile flows**
   - Use mobile viewport browser checks for:
     - Header menu opens, X closes, outside tap closes, route navigation closes.
     - Admin sidebar opens, X closes, outside tap closes.
   - Verify lesson assignment dots render for pending/submitted states and update after submission.
   - Verify backend scan findings are reduced and no new critical security findings remain.

## Technical notes

- Frontend files likely affected: `Header.tsx`, `AdminSidebar.tsx`, `CourseLearning.tsx`, and `AssignmentPanel.tsx`.
- Backend changes will be done through a database migration only.
- Admin users retain unrestricted access; instructor access is scoped to the cohorts/courses they actually teach.