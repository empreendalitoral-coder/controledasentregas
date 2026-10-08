import type { UnifiedRow } from "./financeiro-aggregate";

export type WorkRevenueBasis = "daily" | "received";

/** Daily earnings and their settlement are two views of the same work. */
export function selectWorkRevenue(rows: UnifiedRow[], basis: WorkRevenueBasis): UnifiedRow[] {
  const excluded = basis === "daily" ? "recebimento" : "lancamento";
  return rows.filter((row) => row.origem !== excluded);
}