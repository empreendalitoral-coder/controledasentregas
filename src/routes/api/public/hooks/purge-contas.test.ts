import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), deleteUser: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/lib/cron-auth.server", () => ({ assertCronRequest: async () => null }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from, auth: { admin: { deleteUser: mocks.deleteUser } } } }));
import { Route } from "./purge-contas";

describe("account purge safety", () => {
  afterEach(() => { vi.resetAllMocks(); vi.restoreAllMocks(); });
  it.each([true, false])("reports deletion failure without pre-deleting data: $0", async (failed) => {
    mocks.from.mockImplementation(() => {
      const result = { data: [{ user_id: "expired-account" }], error: null };
      const query = { select: () => query, lte: () => query, is: () => query, limit: async () => result };
      return query;
    });
    mocks.deleteUser.mockResolvedValue({ error: failed ? { message: "Referenced payment" } : null });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const route = Route as unknown as { server: { handlers: { POST: (options: { request: Request }) => Promise<Response> } } };
    const response = await route.server.handlers.POST({ request: new Request("https://example.test", { method: "POST" }) });
    expect(response.status).toBe(failed ? 500 : 200);
    expect(await response.json()).toMatchObject({ ok: !failed, purgados: failed ? 0 : 1, falhas: failed ? 1 : 0 });
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith("contas_excluidas");
  });
});