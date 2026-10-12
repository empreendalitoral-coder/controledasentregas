import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), send: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock("@/lib/fcm.server", () => ({ isFcmConfigured: () => true, sendFcmMessage: mocks.send }));
import { sendTestNotification } from "./admin.functions";

describe("test notification results", () => {
  beforeEach(() => vi.resetAllMocks());
  it.each([
    { results: [{ ok: true }, { ok: false, error: "Provider failed" }], ok: false, enviados: 1, falhas: 1 },
    { results: [{ ok: false, error: "Provider failed" }, { ok: false, error: "Provider failed" }], ok: false, enviados: 0, falhas: 2 },
    { results: [{ ok: true }, { ok: true }], ok: true, enviados: 2, falhas: 0 },
  ])("does not hide failed sends: $enviados sent, $falhas failed", async ({ results, ok, enviados, falhas }) => {
    const insert = vi.fn(async () => ({ error: null }));
    mocks.from.mockImplementation((table: string) => {
      if (table === "notification_envios") return { insert };
      const response = { data: [{ token: "token-one" }, { token: "token-two" }], error: null };
      const query = { select: () => query, eq: () => query, then: (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve) };
      return query;
    });
    for (const result of results) mocks.send.mockResolvedValueOnce(result);
    const handler = sendTestNotification as unknown as (input: unknown) => Promise<unknown>;
    const result = await handler({ data: { titulo: "Test", mensagem: "Test", escopo: "todos" }, context: { userId: "owner" } });
    expect(result).toMatchObject({ ok, enviados, falhas });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ sucesso: ok, erro: falhas ? "Provider failed" : null }));
  });
});