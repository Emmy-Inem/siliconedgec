

# Audit: Missing Features in Admin Section & Backend

## Admin Section Gaps

### 1. No Payment Processing Integration
- The `PaymentModal` simulates payments client-side with `setTimeout` -- no real Stripe or Paystack integration exists. No payment records are stored in the database. The `payment_status` field on enrollments is never updated by an actual payment flow.

### 2. No Certificate Generation
- The Dashboard shows a "Download Certificate" button but it does nothing. There is no certificate generation logic (PDF, image, or otherwise). No `certificates` table exists to track issued certificates.

### 3. No Email Notifications
- No transactional emails are sent (enrollment confirmation, payment receipt, certificate issued, password reset customization). No edge functions exist for email delivery.

### 4. Admin Users Page Lacks Role Management
- `AdminUsers.tsx` only edits `full_name` and `bio` on the profiles table. There is no UI to assign or revoke roles (admin/moderator/user) despite the `user_roles` table and `has_role` function being in place.

### 5. No Admin Activity/Audit Log
- No tracking of admin actions (who deleted a course, updated pricing, etc.). No `audit_log` or `admin_activity` table.

### 6. Enrollments Show Raw UUIDs
- `AdminEnrollments.tsx` displays `user_id` and `course_id` as truncated UUIDs instead of joining to show user names and course titles.

### 7. No Bulk Operations
- No bulk delete, bulk publish/unpublish, or bulk export across any admin tables.

### 8. No Search/Filter on Admin Tables
- `AdminCrudTable` has no search bar, column filtering, or pagination beyond what the component provides.

### 9. No Data Export
- Analytics page has charts but no CSV/Excel export capability for any data.

### 10. No Settings Page
- No admin settings for site-wide configuration (site name, logo, contact info, social links, WhatsApp number, etc.).

## Backend / Database Gaps

### 11. No Edge Functions
- Zero edge functions deployed. No server-side logic for payments, email, webhook handling, or external API integrations.

### 12. No File Storage for Instructors
- `course-thumbnails` bucket exists, but there is no bucket for instructor avatars or user profile photos. The admin instructor page has no upload UI.

### 13. RLS Uses RESTRICTIVE Policies Exclusively
- All RLS policies are marked `Permissive: No` (restrictive). This means multiple policies on the same command require ALL to pass, which could silently block legitimate access. For example, on the `courses` table, both the SELECT and ALL policies are restrictive -- an admin doing a SELECT must satisfy both policies simultaneously.

### 14. No `handle_new_user` Trigger Active
- The `handle_new_user()` function exists but the audit shows "There are no triggers in the database." This means new signups do NOT automatically create a profile row, which will break the Dashboard and user-related queries.

### 15. Enrollments Not Linked via Foreign Key to auth.users
- `enrollments.user_id` has no foreign key constraint, so orphaned records are possible. Same for `influencer_referrals.user_id` and `profiles.user_id`.

### 16. No Realtime Enabled
- No tables are added to `supabase_realtime` publication, so live updates (new enrollments, admin notifications) are not possible.

### 17. No Database Indexes
- No custom indexes beyond primary keys. Queries filtering by `user_id`, `course_id`, `is_published`, `is_active` will slow down as data grows.

## Summary Priority List

| Priority | Item | Type |
|----------|------|------|
| Critical | Missing `handle_new_user` trigger (profiles not created on signup) | Backend |
| Critical | RLS restrictive policy conflict on courses table | Backend |
| High | No role management UI in admin users page | Admin |
| High | No real payment integration | Backend |
| High | Enrollments show raw UUIDs instead of names | Admin |
| Medium | No certificate generation | Both |
| Medium | No instructor avatar uploads | Admin |
| Medium | No search/filter/pagination on admin tables | Admin |
| Medium | No data export (CSV) | Admin |
| Medium | No admin settings page | Admin |
| Low | No audit log | Both |
| Low | No email notifications | Backend |
| Low | No realtime | Backend |
| Low | No bulk operations | Admin |
| Low | No performance indexes | Backend |

Would you like me to start implementing fixes by priority, or focus on specific items from this list?

