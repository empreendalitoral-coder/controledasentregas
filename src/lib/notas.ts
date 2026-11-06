export const CATEGORIAS_NOTA = [
  "Combustível",
  "Manutenção",
  "Alimentação",
  "Pedágio",
  "Estacionamento",
  "Telefone e internet",
  "Impostos e MEI",
  "Equipamentos",
  "Outros",
] as const;
export type CategoriaNota = (typeof CATEGORIAS_NOTA)[number];
export type TipoDocumento = "nota_fiscal" | "recibo" | "cupom" | "outro";

export type LeituraNota = {
  data: string;
  fornecedor: string;
  cnpj_emitente: string;
  valor: number;
  categoria: CategoriaNota;
  descricao: string;
  tipo_documento: TipoDocumento;
};

const hoje = () => new Date().toISOString().slice(0, 10);

export function normalizarLeitura(raw: Record<string, unknown>): LeituraNota {
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const data = typeof raw.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.data) ? raw.data : hoje();
  const valor = typeof raw.valor === "number" && isFinite(raw.valor) && raw.valor >= 0 ? Math.round(raw.valor * 100) / 100 : 0;
  const categoria = (CATEGORIAS_NOTA as readonly string[]).includes(raw.categoria as string)
    ? (raw.categoria as CategoriaNota)
    : "Outros";
  const tipos: TipoDocumento[] = ["nota_fiscal", "recibo", "cupom", "outro"];
  const tipo_documento = tipos.includes(raw.tipo_documento as TipoDocumento) ? (raw.tipo_documento as TipoDocumento) : "outro";
  return {
    data,
    valor,
    categoria,
    tipo_documento,
    fornecedor: str(raw.fornecedor, 200),
    cnpj_emitente: str(raw.cnpj_emitente, 30),
    descricao: str(raw.descricao, 500),
  };
}

export const tipoLabel: Record<TipoDocumento, string> = {
  nota_fiscal: "Nota fiscal",
  recibo: "Recibo",
  cupom: "Cupom",
  outro: "Outro",
};

type Linha = { data: string; fornecedor: string | null; cnpj_emitente: string | null; categoria: string; tipo_documento: string; descricao: string | null; valor: number };

export function notasCSV(rows: Linha[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const head = ["Data", "Fornecedor", "CNPJ emitente", "Categoria", "Documento", "Descrição", "Valor"];
  const body = rows.map((r) =>
    [
      r.data.split("-").reverse().join("/"),
      r.fornecedor ?? "",
      r.cnpj_emitente ?? "",
      r.categoria,
      tipoLabel[r.tipo_documento as TipoDocumento] ?? r.tipo_documento,
      r.descricao ?? "",
      Number(r.valor).toFixed(2).replace(".", ","),
    ].map((v) => esc(String(v))).join(";"),
  );
  return "\uFEFF" + [head.map(esc).join(";"), ...body].join("\n");
}
