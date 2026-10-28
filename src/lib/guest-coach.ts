const VISITOR_KEY = "sec_coach_guest_id";
const COUNT_KEY = "sec_coach_guest_answers";
let memoryVisitor = "";
let memoryCount = 0;
export const GUEST_COACH_LIMIT = 2;

export function guestCoachIdentity() {
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved && /^[0-9a-f-]{36}$/i.test(saved)) return saved;
    memoryVisitor ||= crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, memoryVisitor);
  } catch { memoryVisitor ||= crypto.randomUUID(); }
  return memoryVisitor;
}

export function guestCoachAnswers() {
  try { return Math.max(memoryCount, Number(localStorage.getItem(COUNT_KEY)) || 0); }
  catch { return memoryCount; }
}

export function recordGuestCoachAnswer() {
  memoryCount = guestCoachAnswers() + 1;
  try { localStorage.setItem(COUNT_KEY, String(memoryCount)); } catch { /* Keep the in-memory quota. */ }
}
