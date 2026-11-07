import { describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), validate: undefined as undefined | ((value: { dataUrl: string }) => unknown) }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: (fn: typeof mocks.validate) => { mocks.validate = fn; return builder; }, handler: (fn: unknown) => fn };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@lovable.dev/ai-gateway", () => ({ generateResponse: mocks.generate, GatewayError: class extends Error {} }));
import { lerNotaFn } from "./notas.functions";
const handler = lerNotaFn as unknown as (input: { data: { dataUrl: string } }) => Promise<{ valor: number; categoria: string }>;
describe("leitura autenticada de documentos", () => {
  it("rejeita conteúdo disfarçado de PDF antes de chamar IA", () => {
    expect(() => mocks.validate?.({ dataUrl: "data:application/pdf;base64," + btoa("texto") })).toThrow();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("rejeita base64 com conteúdo extra", () => {
    expect(() => mocks.validate?.({ dataUrl: "data:application/pdf;base64,JVBERi0= injected" })).toThrow();
  });
  it("aceita cabeçalho PDF", () => {
    const input = { dataUrl: "data:application/pdf;base64," + btoa("%PDF-1.7\n") };
    expect(mocks.validate?.(input)).toEqual(input);
  });
  it("extrai resposta estruturada sem salvar automaticamente", async () => {
    mocks.generate.mockResolvedValueOnce({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ valor: 120.5, categoria: "Combustível" }) }] }] });
    expect(await handler({ data: { dataUrl: "image" } })).toMatchObject({ valor: 120.5, categoria: "Combustível" });
  });
  it("não trata uma recusa como despesa de valor zero", async () => {
    mocks.generate.mockResolvedValueOnce({ output: [{ type: "message", content: [{ type: "refusal", refusal: "Não legível" }] }] });
    await expect(handler({ data: { dataUrl: "image" } })).rejects.toThrow("Preencha os dados manualmente");
  });
});