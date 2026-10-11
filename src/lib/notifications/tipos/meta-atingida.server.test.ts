import { describe, expect, it, vi } from "vitest";
import { tipoMetaAtingida } from "./meta-atingida.server";

describe("aviso de meta atingida", () => {
  it("consulta os campos reais e seleciona somente metas concluídas", async () => {
    const not = vi.fn();
    not.mockReturnValueOnce({ not }).mockResolvedValueOnce({ data: [
      { id: "1", user_id: "user", nome: "Reserva", valor_meta: 100, valor_atual: 100 },
      { id: "2", user_id: "user", nome: "Outra", valor_meta: 200, valor_atual: 100 },
      { id: "3", user_id: "user", nome: "Zero", valor_meta: 0, valor_atual: 100 },
    ], error: null });
    const select = vi.fn(() => ({ not }));
    const from = vi.fn(() => ({ select }));
    const result = await tipoMetaAtingida.scan?.({ from } as never);
    expect(select).toHaveBeenCalledWith("id, user_id, nome, valor_meta, valor_atual");
    expect(result).toEqual([{ userId: "user", dedupKey: "meta:1", contexto: { id: "1", titulo: "Reserva", valor: 100 } }]);
  });

  it("propaga falhas para o cron não registrar sucesso falso", async () => {
    const error = { message: "Falha simulada" };
    const not = vi.fn();
    not.mockReturnValueOnce({ not }).mockResolvedValueOnce({ data: null, error });
    const from = vi.fn(() => ({ select: () => ({ not }) }));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(tipoMetaAtingida.scan?.({ from } as never)).rejects.toEqual(error);
    log.mockRestore();
  });
});