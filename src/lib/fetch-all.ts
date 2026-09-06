import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch every row from a table in batches, working around Supabase's
 * default 1000-row PostgREST cap. We page by `created_at` ordering with
 * `range()` until a short page returns. Use sparingly — only call for
 * admin-side analytics where we genuinely need all rows.
 */
export async function fetchAllRows<T = any>(
  table: string,
  select = "*",
  opts: { orderColumn?: string; ascending?: boolean; pageSize?: number; max?: number } = {},
): Promise<T[]> {
  const orderColumn = opts.orderColumn ?? "created_at";
  const ascending = opts.ascending ?? false;
  const pageSize = Math.min(opts.pageSize ?? 1000, 1000);
  const max = opts.max ?? 10000;

  const out: T[] = [];
  let from = 0;
  // Hard ceiling to prevent runaway loops.
  while (out.length < max) {
    const to = from + pageSize - 1;
    const { data, error } = await (supabase.from(table as any) as any)
      .select(select)
      .order(orderColumn, { ascending })
      .range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}