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
});