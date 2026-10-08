import { describe, expect, it } from "vitest";
import { automaticFiscalClass, fiscalCSV, fiscalSummary, type FiscalRow } from "./fiscal";

const make = (classification: FiscalRow["classification"], tipo: FiscalRow["tipo"], valor: number): FiscalRow => ({ id: `${classification}-${tipo}`, data: "2026-10-09", tipo, categoria: "Teste", descricao: "Teste", valor, origem: "fluxo_manual", classification });
describe("separação fiscal", () => {
  it("separa automaticamente rotas e despesas do trabalho no CNPJ", () => {
    for (const origem of ["lancamento", "recebimento", "abastecimento", "manutencao", "pnr", "perdidos"] as const) {
      expect(automaticFiscalClass({ ...make("cpf", "entrada", 150), origem })).toBe("cnpj");
    }
  });
  it("separa automaticamente contas, cartões, fluxo pessoal e Pix no CPF", () => {
    for (const origem of ["conta_fixa", "cartao", "fluxo_manual", "pix_recebido", "pix_enviado"] as const) {
      expect(automaticFiscalClass({ ...make("cnpj", "entrada", 80), origem })).toBe("cpf");
    }
  });
  it("mantém os totais CNPJ e CPF separados", () => {
    const rows = [make("cnpj", "entrada", 150), make("cnpj", "saida", 30), make("cpf", "entrada", 80)];
    expect(fiscalSummary(rows, "cnpj")).toEqual({ receitas: 150, despesas: 30, saldo: 120, count: 2 });
    expect(fiscalSummary(rows, "cpf").receitas).toBe(80);
  });
  it("exporta classificação, origem e valores e neutraliza fórmulas de planilha", () => {
    const csv = fiscalCSV([{ ...make("cpf", "entrada", 10.5), descricao: '=HYPERLINK("teste")' }]);
    expect(csv).toContain("CPF · Pessoal");
    expect(csv).toContain('"10,50"');
    expect(csv).toContain("'=HYPERLINK");
  });
});