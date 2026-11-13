import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: mocks.rpc } }));
import { assertCronRequest } from "./cron-auth.server";

describe("scheduled task authorization", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
  it("rejects missing credentials without accessing data", async () => {
    const response = await assertCronRequest(new Request("https://example.test"));
    expect(response?.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("fails closed when credential validation fails", async () => {
    vi.stubEnv("CRON_SECRET", "");
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Unavailable" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await assertCronRequest(new Request("https://example.test", { headers: { "x-cron-secret": "test-invalid" } }));
    expect(response?.status).toBe(401);
    vi.restoreAllMocks();
  });
  it("rejects a retired environment credential even when it matches", async () => {
    vi.stubEnv("CRON_SECRET", "retired-credential");
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const response = await assertCronRequest(new Request("https://example.test", { headers: { "x-cron-secret": "retired-credential" } }));
    expect(response?.status).toBe(401);
    expect(mocks.rpc).toHaveBeenCalledWith("cron_token_valido", { _token: "retired-credential" });
  });
  it("accepts only a currently validated database credential", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    expect(await assertCronRequest(new Request("https://example.test", { headers: { "x-cron-secret": "current-test-credential" } }))).toBeNull();
  });
});