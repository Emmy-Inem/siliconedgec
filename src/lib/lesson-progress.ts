/**
 * Pure helpers for sequential lesson-unlock logic.
 * Extracted so they can be unit-tested without React/Supabase.
 */

export interface LessonRef {
  id: string;
  module_id?: string;
  order_index?: number;
}

export interface UnlockContext {
  /** Lessons in playback order (module order, then lesson order). */
  lessons: LessonRef[];
  /** Set of lesson ids the user has completed. */
  completed: Set<string>;
  /** Admins / moderators bypass unlock gating. */
  isStaff?: boolean;
  /** Whether the user has a paid enrollment. */
  hasPaid?: boolean;
}

export function isLessonUnlocked(lessonId: string, ctx: UnlockContext): boolean {
  if (ctx.isStaff) return true;
  if (!ctx.hasPaid) return false;
  const idx = ctx.lessons.findIndex((l) => l.id === lessonId);
  if (idx <= 0) return idx === 0;
  // Out-of-order completions don't unlock later lessons:
  // every previous lesson in the ordered list must be completed.
  return ctx.completed.has(ctx.lessons[idx - 1].id);
}

/**
 * The lesson the user should resume on. Returns the first incomplete lesson
 * after a fully-completed prefix, or the first lesson if nothing completed.
 * Returns null when there are no lessons or the user has no access.
 */
export function findResumeLesson(ctx: UnlockContext): LessonRef | null {
  if (!ctx.lessons.length) return null;
  if (ctx.isStaff) return ctx.lessons[0];
  if (!ctx.hasPaid) return null;
  let target = ctx.lessons[0];
  for (let i = 0; i < ctx.lessons.length; i++) {
    if (i === 0 || ctx.completed.has(ctx.lessons[i - 1].id)) target = ctx.lessons[i];
    else break;
  }
  return target;
}

/** True if every lesson has been completed (i.e. course is finished). */
export function isCourseComplete(ctx: UnlockContext): boolean {
  if (!ctx.lessons.length) return false;
  return ctx.lessons.every((l) => ctx.completed.has(l.id));
}

/** Compact "done/total" indicator data for a course. */
export function lessonCounts(ctx: UnlockContext): { done: number; total: number } {
  const total = ctx.lessons.length;
  const done = ctx.lessons.reduce((n, l) => (ctx.completed.has(l.id) ? n + 1 : n), 0);
  return { done, total };
}
