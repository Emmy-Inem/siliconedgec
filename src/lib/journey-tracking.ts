import { supabase } from "@/integrations/supabase/client";
import { shouldSkipPassiveEvent } from "./track-lead";

export const JOURNEY_NOTICE_VERSION = "journey-2026-10-30";
export async function saveJourneyChoice(accepted: boolean) {
  const id = crypto.randomUUID();
  let visitor = localStorage.getItem("sec_journey_visitor");
  if (!visitor) { visitor = crypto.randomUUID(); localStorage.setItem("sec_journey_visitor", visitor); }
  // Refusal is immediate, even when the connection is unavailable.
  localStorage.setItem("sec_journey_consent", JSON.stringify({ id, version: JOURNEY_NOTICE_VERSION, accepted: false }));
  const { error } = await supabase.rpc("record_journey_choice", { p_id: id, p_visitor: visitor, p_accepted: accepted });
  if (error) throw error;
  localStorage.setItem("sec_journey_consent", JSON.stringify({ id, version: JOURNEY_NOTICE_VERSION, accepted, at: new Date().toISOString() }));
  if (!accepted) sessionStorage.removeItem("sec_journey_session");
}
export function journeyAllowed() {
  try {
    const choice = JSON.parse(localStorage.getItem("sec_journey_consent") || "null");
    return choice?.version === JOURNEY_NOTICE_VERSION && choice?.accepted === true &&
      !shouldSkipPassiveEvent("pageview", location.hostname, navigator.userAgent) &&
      !/^\/admin(\/|$)/.test(location.pathname);
  } catch { return false; }
}

export function journeyPath(path: string) {
  const clean = path.split(/[?#]/)[0];
  if (/^\/(orders|support|cohorts)\/[^/]+$/.test(clean)) return `/${clean.split("/")[1]}/:id`;
  if (/^\/verify\/[^/]+$/.test(clean)) return "/verify/:code";
  if (/^\/quizzes\/[^/]+\/attempts$/.test(clean)) return "/quizzes/:id/attempts";
  if (clean === "/" || /^\/(courses|cart|for-businesses|certificates|pricing|career|sign-in|sign-up|forgot-password|dashboard|verify|jobs|instructors|paths|help|trust|blog|contact|about|locations|faq|testimonials|bookmarks|account|support|refer|search|cohorts|bootcamp|terms|privacy|refund-policy|cookie-policy)$/.test(clean)) return clean;
  if (/^\/(courses|instructors|jobs|paths|help|blog|locations|category|p)\/[a-zA-Z0-9_-]+(?:\/(learn|quizzes|assignments|related))?$/.test(clean)) return clean.slice(0, 300);
  return null;
}

export type JourneyEvent = "page_view" | "cart_added" | "cart_removed" | "checkout_started" | "checkout_redirected" | "checkout_error" | "signup_error" | "signin_error" | "signup_submitted";
let fallbackSession: string | undefined;
export function journeySession(now = Date.now()) {
  try {
    const saved = JSON.parse(sessionStorage.getItem("sec_journey_session") || "null");
    const id = saved && now - saved.last < 30 * 60_000 ? saved.id : crypto.randomUUID();
    sessionStorage.setItem("sec_journey_session", JSON.stringify({ id, last: now }));
    return id as string;
  } catch { fallbackSession ??= crypto.randomUUID(); return fallbackSession; }
}

export async function trackJourney(event: JourneyEvent, reason?: "validation" | "authentication" | "payment_setup" | "payment_verification", capturedPath = location.pathname) {
  if (!journeyAllowed()) return;
  const path = journeyPath(capturedPath);
  if (!path) return;
  // No field contents, email addresses, payment references or query strings.
  try {
    await supabase.rpc("record_journey_event", {
      p_event: event, p_path: path, p_session: journeySession(), p_reason: reason || null,
      p_notice: JOURNEY_NOTICE_VERSION,
      p_consent: JSON.parse(localStorage.getItem("sec_journey_consent") || "null")?.id,
    });
  } catch { /* Optional measurement must never block customer actions. */ }
}