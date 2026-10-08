import { describe, expect, it } from "vitest";
import { selectWorkRevenue } from "./financial-source";
import { automaticFiscalClass, fiscalCSV, fiscalSummary } from "./fiscal";
import type { UnifiedRow } from "./financeiro-aggregate";

const row = (origem: UnifiedRow["origem"], valor: number, data = "2026-10-08"): UnifiedRow => ({
  id: origem, origem, valor, data, tipo: "entrada", categoria: origem, descricao: origem,
});
const fiscal = (rows: UnifiedRow[]) => selectWorkRevenue(rows, "daily").map((r) => ({ ...r, classification: automaticFiscalClass(r) }));

describe("single source of work revenue", () => {
  it("counts 1000 in daily earnings plus a 1000 settlement only once in fiscal totals and exports", () => {
    const rows = fiscal([row("lancamento", 1000), row("recebimento", 1000)]);
    expect(fiscalSummary(rows, "cnpj").receitas).toBe(1000);
    expect(rows).toHaveLength(1);
    expect(fiscalCSV(rows)).not.toContain('"recebimento"');
  });
  it("keeps unpaid daily earnings in their work month, not the later settlement month", () => {
    const rows = [row("lancamento", 1000, "2026-10-08"), row("recebimento", 1000, "2026-11-08")];
    expect(fiscal(rows.filter(r => r.data.startsWith("2026-10")))[0]?.valor).toBe(1000);
    expect(fiscal(rows.filter(r => r.data.startsWith("2026-11")))).toHaveLength(0);
  });
  it("cash flow counts only settled work and leaves Pix and expenses unchanged", () => {
    const expense = { ...row("conta_fixa", 20), tipo: "saida" as const };
    const rows = [row("lancamento", 1000), row("recebimento", 1000), row("pix_recebido", 50), expense];
    expect(selectWorkRevenue(rows, "received")).toEqual(rows.slice(1));
    expect(selectWorkRevenue([row("lancamento", 1000)], "received")).toEqual([]);
    expect(fiscal(rows).find(r => r.origem === "pix_recebido")?.classification).toBe("cpf");
    expect(fiscal(rows).find(r => r.origem === "conta_fixa")?.classification).toBe("cpf");
  });
});