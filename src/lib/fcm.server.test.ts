import { afterEach, describe, expect, it, vi } from "vitest";

describe("preservação de tokens FCM", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it.each([
    [400, { error: { status: "INVALID_ARGUMENT" } }, false],
    [404, { error: { status: "NOT_FOUND" } }, false],
    [404, { error: { details: [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode: "UNREGISTERED" }] } }, true],
  ])("resposta %s só invalida token com confirmação explícita", async (status, response, invalidToken) => {
    vi.resetModules();
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", JSON.stringify({ project_id: "test", client_email: "test@example.invalid", private_key: "-----BEGIN PRIVATE KEY-----\nYQ==\n-----END PRIVATE KEY-----" }));
    vi.stubGlobal("crypto", { subtle: {
      importKey: vi.fn().mockResolvedValue({}),
      sign: vi.fn().mockResolvedValue(new ArrayBuffer(1)),
    } });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ access_token: "fake-token", expires_in: 3600 }))
      .mockResolvedValueOnce(Response.json(response, { status })));
    const { sendFcmMessage } = await import("./fcm.server");
    const result = await sendFcmMessage({ token: "fake-device", title: "Teste", body: "Teste" });
    expect(result.ok).toBe(false);
    expect("invalidToken" in result && result.invalidToken === true).toBe(invalidToken);
  });
});