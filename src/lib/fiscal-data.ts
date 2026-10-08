import { queryOptions } from "@tanstack/react-query";
import { loadFinanceiroUnificado } from "./financeiro-aggregate";
import { automaticFiscalClass, type FiscalRow } from "./fiscal";

export const fiscalQuery = (year: number) => queryOptions({
  queryKey: ["fiscal", "automatic", year],
  queryFn: async (): Promise<FiscalRow[]> => {
    const rows = await loadFinanceiroUnificado({ start: `${year}-01-01`, end: `${year}-12-31` });
    return rows.map((row) => ({ ...row, classification: automaticFiscalClass(row) }));
  },
});