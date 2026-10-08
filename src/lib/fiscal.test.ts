import { describe, expect, it } from "vitest";
import { fiscalCSV, fiscalSummary, type FiscalRow } from "./fiscal";

const make = (classification: FiscalRow["classification"], tipo: FiscalRow["tipo"], valor: number): FiscalRow => ({ id: `${classification}-${tipo}`, data: "2026-10-09", tipo, categoria: "Teste", descricao: "Teste", valor, origem: "fluxo_manual", classification });
describe("separação fiscal", () => {
  it("separa CNPJ de CPF e não soma pendências, transferências ou duplicados", () => {
    const rows = [make("cnpj", "entrada", 150), make("cnpj", "saida", 30), make("cpf", "entrada", 80), make("transferencia", "entrada", 150), make("duplicado", "entrada", 150), make("nao_classificado", "entrada", 200)];
    expect(fiscalSummary(rows, "cnpj")).toEqual({ receitas: 150, despesas: 30, saldo: 120, count: 2 });
    expect(fiscalSummary(rows, "cpf").receitas).toBe(80);
    expect(fiscalSummary(rows, "nao_classificado").count).toBe(1);
  });
  it("exporta classificação, origem e valores e neutraliza fórmulas de planilha", () => {
    const csv = fiscalCSV([{ ...make("cpf", "entrada", 10.5), descricao: '=HYPERLINK("teste")' }]);
    expect(csv).toContain("CPF · Pessoal");
    expect(csv).toContain('"10,50"');
    expect(csv).toContain("'=HYPERLINK");
  });
});