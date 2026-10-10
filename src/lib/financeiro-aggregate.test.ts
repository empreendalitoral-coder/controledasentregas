import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: mocks.getUser }, from: mocks.from } }));
import { loadFinanceiroUnificado } from "./financeiro-aggregate";

describe("Unified financial read failures", () => {
  beforeEach(() => vi.resetAllMocks());

  it("does not show an empty report when authentication fails", async () => {
    const error = new Error("Network unavailable");
    mocks.getUser.mockResolvedValue({ data: { user: null }, error });
    await expect(loadFinanceiroUnificado()).rejects.toThrow("Network unavailable");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("requires a valid session rather than returning zero totals", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(loadFinanceiroUnificado()).rejects.toThrow("Sua sessão expirou");
  });

  it("rejects partial data when any financial source fails", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
    mocks.from.mockImplementation((table: string) => {
      const response = { data: [], error: table === "pix_enviados" ? new Error("Read failed") : null };
      const query = { select: () => query, eq: () => query, then: (resolve: (value: typeof response) => unknown) => Promise.resolve(response).then(resolve) };
      return query;
    });
    await expect(loadFinanceiroUnificado()).rejects.toThrow("Read failed");
    expect(mocks.from).toHaveBeenCalledTimes(9);
  });
});