import type { UnifiedRow } from "./financeiro-aggregate";

export const fiscalLabels = {
  cnpj: "CNPJ · MEI",
  cpf: "CPF · Pessoal",
} as const;
export type FiscalClass = keyof typeof fiscalLabels;
export type FiscalRow = UnifiedRow & { classification: FiscalClass };

export function automaticFiscalClass(row: UnifiedRow): FiscalClass {
  switch (row.origem) {
    case "pix_recebido":
    case "pix_enviado":
    case "conta_fixa":
    case "cartao":
    case "fluxo_manual":
      return "cpf";
    default:
      return "cnpj";
  }
}

export function fiscalSummary(rows: FiscalRow[], classification: FiscalClass) {
  const selected = rows.filter((row) => row.classification === classification);
  const receitas = selected.filter((row) => row.tipo === "entrada").reduce((sum, row) => sum + row.valor, 0);
  const despesas = selected.filter((row) => row.tipo === "saida").reduce((sum, row) => sum + row.valor, 0);
  return { receitas, despesas, saldo: receitas - despesas, count: selected.length };
}

export function fiscalCSV(rows: FiscalRow[]) {
  const quote = (value: string) => `"${value.replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
  return "\uFEFF" + [
    ["Data", "Classificação", "Tipo", "Categoria", "Descrição", "Valor (R$)", "Origem"],
    ...rows.map((row) => [row.data, fiscalLabels[row.classification], row.tipo === "entrada" ? "Receita" : "Despesa", row.categoria, row.descricao, row.valor.toFixed(2).replace(".", ","), row.origem]),
  ].map((row) => row.map(quote).join(";")).join("\r\n");
}