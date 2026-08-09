# AI Support Assistant, Human Handoff & Support Tickets

Turn the floating chat bubble into an AI-first support assistant, with a clean escalation path to human admins backed by a real support ticket system and automatic emails.

## 1. Floating chat becomes AI-first

- Sign-in required: signed-out visitors see a short "Sign in to chat with our assistant" card with a sign-in button instead of the composer.
- Two modes inside the same widget:
  - **Assistant** (default): streams answers from a new site-wide AI support function that knows about courses, pricing, cohorts, certificates, payments/installments, the career/partner program, and the user's own enrolments.
  - **Human support**: the existing live chat with admins (current `chat_conversations` / `chat_messages` flow), unchanged in behaviour.
- A persistent "Talk to a human" button in the assistant header. Pressing it opens/creates the live conversation, creates a support ticket, and emails all admins.
- Answers render as markdown (reuse the existing markdown view used by the tutor).

## 2. Automatic escalation when the AI can't answer

- The assistant is instructed to emit a clear "unresolved" signal when it lacks a grounded answer (out of scope, account-specific, billing dispute, bug report).
- On that signal the backend automatically:
  1. Creates a support ticket with the conversation transcript,
  2. Emails every admin,
  3. Shows the user: "I've passed this to our team — ticket #1234. You'll get an email reply."
- Same path runs when the user explicitly asks for a human.

## 3. Support ticket system

New tables: `support_tickets` and `support_ticket_messages`.

Ticket fields: subject, body, status (open / pending / resolved / closed), priority, category, source (ai_escalation / human_request / contact_form), assigned admin, linked chat conversation, resolution note, timestamps, last activity.

- **User side**: "Support" section in the account/dashboard area listing their tickets, ticket detail page with threaded replies and status, plus a "New ticket" form.
- **Admin side**: a Support Tickets page inside the Communication hub — filter by status/priority/assignee, assign, reply (reply emails the user), change status, resolve/close. Unread counts surface in the admin sidebar.
- Access rules: users see and reply only to their own tickets; admins/moderators see and manage all.

## 4. Automatic emails

A single reusable notification layer built on the existing `send-email` function, with admin-editable templates:

To admins:
- New human-chat request
- AI escalation / unanswered question
- New ticket created, and new user reply on a ticket

To users:
- Ticket received (with ticket number)
- Admin replied to your ticket
- Ticket resolved (with a short satisfaction prompt)

Admin recipients come from the `admin` role list, with the site-settings support address as fallback. Sends are deduplicated so one event never fans out twice.

## 5. Milestone automations ("unique activity" emails)

Event-driven emails triggered once per user per milestone (recorded in an `automation_events` table so nothing repeats):
- Welcome after signup
- Enrolment confirmed
- First lesson completed
- 50% course progress
- Course completed / certificate ready
- First assignment submitted, and assignment graded
- Cohort access granted
- Installment payment received and installment due/overdue reminders (reuse the existing overdue job)
- Inactivity nudge after 7 days with no lesson activity
- Career/partner: application approved, first referral, payout approved

Admins get a "Automations" panel to switch each automation on/off and edit its template, plus a log of what was sent to whom.

## Technical notes

- New edge function `ai-support` (streamed, gateway-backed, auth required) with a support-specific system prompt, retrieval over published courses/FAQ/help articles, and a structured `escalate` tool the model calls when it cannot answer. `verify_jwt = true`.
- New edge function `support-notify` for admin/user ticket emails; reuses `send-email` templates and the `tpl_*` site_content mechanism.
- Milestone automations run from database triggers writing to a queue table, drained by a scheduled `run-automations` function; idempotent via a unique key per (user, automation, ref).
- Migrations include GRANTs plus RLS: owner-scoped for users, `has_role(auth.uid(),'admin')` for staff; all new functions set `search_path`.
- Client work is confined to `LiveChat.tsx` (mode switch + gating), new ticket pages/routes, and admin hub tabs.
