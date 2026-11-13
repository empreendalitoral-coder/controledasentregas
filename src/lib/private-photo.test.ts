import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ download: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: mocks.from } } }));
import { downloadPrivatePhoto } from "./private-photo";
describe("authenticated photo reads", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.from.mockReturnValue({ download: mocks.download }); });
  it("downloads the requested photo using storage permissions", async () => {
    const blob = new Blob(["photo"], { type: "image/jpeg" });
    mocks.download.mockResolvedValue({ data: blob, error: null });
    expect(await downloadPrivatePhoto("feed-photos", "owner/photo.jpg")).toBe(blob);
    expect(mocks.from).toHaveBeenCalledWith("feed-photos");
    expect(mocks.download).toHaveBeenCalledWith("owner/photo.jpg");
  });
  it("does not expose a photo when permission is denied", async () => {
    mocks.download.mockResolvedValue({ data: null, error: { message: "denied" } });
    await expect(downloadPrivatePhoto("community-photos", "owner/photo.jpg")).rejects.toThrow("Não foi possível carregar esta foto.");
  });
});