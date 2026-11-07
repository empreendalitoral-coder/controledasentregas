import { describe, expect, it } from "vitest";
import { normalizarLeitura, notasCSV, validarArquivoNota, validarDespesaNota } from "./notas";

describe("leitura de notas", () => {
  it("aceita PDF de 6 MB e rejeita acima do limite", () => {
    expect(() => validarArquivoNota("application/pdf", 6 * 1024 * 1024)).not.toThrow();
    expect(() => validarArquivoNota("application/pdf", 6 * 1024 * 1024 + 1)).toThrow();
  });
  it("rejeita executáveis e arquivos vazios", () => {
    expect(() => validarArquivoNota("application/octet-stream", 100)).toThrow();
    expect(() => validarArquivoNota("image/png", 0)).toThrow();
  });
  it("exige data real e valor positivo antes de salvar", () => {
    expect(() => validarDespesaNota({ ...normalizarLeitura({ valor: 10 }), data: "2026-02-30" })).toThrow();
    expect(() => validarDespesaNota(normalizarLeitura({ valor: 0 }))).toThrow();
    expect(() => validarDespesaNota(normalizarLeitura({ data: "2026-11-07", valor: 120.5 }))).not.toThrow();
  });
  it("neutraliza fórmulas de planilha em dados recebidos", () => {
    expect(notasCSV([{ data: "2026-11-07", fornecedor: "=1+1", cnpj_emitente: null, categoria: "Outros", tipo_documento: "recibo", descricao: null, valor: 10 }])).toContain('"\'=1+1"');
  });
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
