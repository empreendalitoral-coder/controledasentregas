import { describe, expect, it } from "vitest";
import { normalizarLeitura, notasCSV } from "./notas";

describe("leitura de notas", () => {
  it("categoria desconhecida vira Outros e valor é arredondado", () => {
    const r = normalizarLeitura({ data: "2026-11-05", valor: 45.678, categoria: "Lazer", tipo_documento: "cupom" });
    expect(r.categoria).toBe("Outros");
    expect(r.valor).toBe(45.68);
  });
  it("valor negativo ou ilegível vira 0", () => {
    expect(normalizarLeitura({ valor: -10 }).valor).toBe(0);
    expect(normalizarLeitura({ valor: null }).valor).toBe(0);
  });
  it("CSV usa ponto e vírgula e vírgula decimal", () => {
    const csv = notasCSV([{ data: "2026-11-05", fornecedor: "Posto", cnpj_emitente: null, categoria: "Combustível", tipo_documento: "nota_fiscal", descricao: null, valor: 120.5 }]);
    expect(csv).toContain('"05/11/2026";"Posto";"";"Combustível";"Nota fiscal";"";"120,50"');
  });
});
