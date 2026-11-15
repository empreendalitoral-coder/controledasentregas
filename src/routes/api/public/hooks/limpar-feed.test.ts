import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn(), remove: vi.fn(), deleteRow: vi.fn(), lte: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/integrations/supabase/cron-auth", () => ({ authenticateCronRequest: mocks.auth }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from, storage: { from: () => ({ remove: mocks.remove }) } } }));
import { Route } from "./limpar-feed";
const route = Route as unknown as { server: { handlers: { POST: (args: { request: Request }) => Promise<Response> } } };
const run = () => route.server.handlers.POST({ request: new Request("https://example.test", { method: "POST" }) });
describe("Feed cleanup", () => {
  afterEach(() => { vi.resetAllMocks(); vi.useRealTimers(); });
  it("rejects unauthenticated cleanup before reading posts", async () => {
    mocks.auth.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    expect((await run()).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each([true, false])("only removes expired posts after successful photo deletion: %s", async (photoFails) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-15T03:00:00Z"));
    mocks.auth.mockResolvedValue(null);
    const query = { select: () => query, lte: mocks.lte, order: () => query, limit: async () => ({ data: [{ id: "old-post", image_path: "owner/photo.jpg" }], error: null }), delete: mocks.deleteRow, eq: () => query };
    mocks.lte.mockReturnValue(query);
    mocks.from.mockReturnValue(query);
    mocks.deleteRow.mockReturnValue({ eq: () => ({ lte: async () => ({ error: null }) }) });
    mocks.remove.mockResolvedValue({ error: photoFails ? { message: "unavailable" } : null });
    const response = await run();
    expect(mocks.lte).toHaveBeenCalledWith("created_at", "2026-11-14T03:00:00.000Z");
    expect(mocks.remove).toHaveBeenCalledWith(["owner/photo.jpg"]);
    expect(mocks.deleteRow).toHaveBeenCalledTimes(photoFails ? 0 : 1);
    expect(response.status).toBe(photoFails ? 500 : 200);
    expect(await response.json()).toEqual({ ok: !photoFails, deleted: photoFails ? 0 : 1, failed: photoFails ? 1 : 0 });
  });
});