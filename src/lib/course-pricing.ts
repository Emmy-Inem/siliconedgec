/** The admin "Original / Strikethrough" price is stored in courses.discount_price. */
export function getCompareAtPrice(course: { price?: number | null; discount_price?: number | null }): number | null {
  const price = Number(course.price ?? 0);
  const original = course.discount_price == null ? null : Number(course.discount_price);
  return original != null && price > 0 && original > price ? original : null;
}

export function getPercentOff(course: { price?: number | null; discount_price?: number | null }): number | null {
  const original = getCompareAtPrice(course);
  if (!original) return null;
  return Math.round(((original - Number(course.price)) / original) * 100);
}
