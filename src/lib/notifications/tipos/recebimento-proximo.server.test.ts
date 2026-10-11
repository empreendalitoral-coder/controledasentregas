import { describe, expect, it, vi } from "vitest";
import { tipoRecebimentoProximo } from "./recebimento-proximo.server";

describe("notificação de recebimento próximo", () => {
  it("usa período, data de pagamento e valor recebido quando informado", () => {
    const contexto = {
      id: "recebimento-1",
      nome_periodo: "2ª quinzena",
      valor_recebido: 1234.5,
      data_pagamento: "2026-10-06",
    };

    expect(tipoRecebimentoProximo.titulo(contexto)).toContain("R$ 1.234,50");
    expect(tipoRecebimentoProximo.corpo(contexto)).toBe("2ª quinzena — pagamento em 06/10/2026");
  });

  it("continua útil quando o valor ainda não foi informado", () => {
    expect(
      tipoRecebimentoProximo.titulo({
        id: "recebimento-2",
        nome_periodo: "1ª quinzena",
        data_pagamento: "2026-10-07",
      }),
    ).toBe("Recebimento previsto para amanhã");
  });

  it("consulta somente os campos reais e registra falhas", async () => {
    const error = { message: "falha simulada" };
    const neq = vi.fn().mockResolvedValue({ data: null, error });
    const eq = vi.fn(() => ({ neq }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(tipoRecebimentoProximo.scan?.({ from } as never)).rejects.toEqual(error);

    expect(select).toHaveBeenCalledWith("id, user_id, nome_periodo, valor_recebido, data_pagamento, status");
    expect(consoleError).toHaveBeenCalledWith("[notif recebimento_proximo] scan erro", error);
    consoleError.mockRestore();
  });
});