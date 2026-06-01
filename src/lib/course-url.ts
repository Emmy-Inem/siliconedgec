/** Build a public course URL preferring slug, falling back to id.
 *  Accepts any course-shaped object that may have `slug` and `id`. */
export function courseHref(c: { slug?: string | null; id: string } | null | undefined): string {
  if (!c) return "/courses";
  return `/courses/${c.slug && c.slug.length > 0 ? c.slug : c.id}`;
}

export function courseLearnHref(c: { slug?: string | null; id: string } | null | undefined): string {
  if (!c) return "/courses";
  return `${courseHref(c)}/learn`;
}

export function courseSectionHref(
  c: { slug?: string | null; id: string } | null | undefined,
  section: "quizzes" | "assignments" | "related",
): string {
  if (!c) return "/courses";
  return `${courseHref(c)}/${section}`;
}
