import { describe, expect, it } from "vitest";
import { monthlyShareMetrics } from "./monthly-share";
import type { Resumo } from "./calc";

const resumo: Resumo = { dias_trabalhados: 2, dias_folga: 0, horas: 16, pacotes: 100, insucessos: 5, pnr: 0, pacotes_perdidos: 0, km: 200, combustivel: 80, valor_bruto: 600, descontos: 20, lucro_liquido: 580, manutencoes: 100, lucro_real: 400 };

describe("monthly sharing reuses the existing results", () => {
  it("uses delivered parcels and the approved success rate, not loaded parcels", () => {
    expect(monthlyShareMetrics(resumo)).toMatchObject({ entregas: "95", taxa: "95,0%" });
  });
  it("keeps the already computed operational profit", () => {
    expect(monthlyShareMetrics(resumo).lucro).toBe("R$ 400,00");
  });
  it("has no success rate without parcels", () => {
    expect(monthlyShareMetrics({ ...resumo, pacotes: 0, insucessos: 0 })).toMatchObject({ entregas: "0", taxa: "—" });
  });
});