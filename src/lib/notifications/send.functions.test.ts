import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./registry.server", () => ({
  getTipo: () => ({ titulo: () => "Aviso", corpo: () => "Mensagem" }),
}));
vi.mock("@/lib/fcm.server", () => ({
  isFcmConfigured: () => true,
  sendFcmMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

import { dispatchNotification, unregisterDeviceToken, removeDeviceById, listNotificationSettings, dispatchNotificationFn } from "./send.functions";
import { sendFcmMessage } from "@/lib/fcm.server";

function client(results: Record<string, Array<{ data?: unknown; error?: unknown }>>) {
  const from = vi.fn((table: string) => {
    const result = results[table]?.shift() ?? { data: null, error: null };
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "delete", "insert", "in", "upsert"]) {
      query[method] = vi.fn(() => query);
    }
    query.maybeSingle = vi.fn(async () => result);
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return query;
  });
  return { from };
}

const args = { userId: "user-1", tipoCodigo: "meta_atingida", contexto: {}, dedupKey: "meta:1" };

describe("confirmações e preferências de notificações", () => {
  beforeEach(() => vi.clearAllMocks());

  it("respeita o padrão desativado sem enviar", async () => {
    const admin = client({
      notification_tipos: [{ data: { disponivel: true, padrao_ativo: false } }],
    });
    expect(await dispatchNotification(admin as never, args)).toEqual({ ok: true, skipped: "opt_out" });
    expect(sendFcmMessage).not.toHaveBeenCalled();
  });

  it("não envia tipos indisponíveis", async () => {
    const admin = client({ notification_tipos: [{ data: { disponivel: false } }] });
    expect(await dispatchNotification(admin as never, args)).toEqual({ ok: true, skipped: "tipo_indisponivel" });
    expect(sendFcmMessage).not.toHaveBeenCalled();
  });

  it("não interpreta falha ao consultar tokens como ausência de dispositivos", async () => {
    const admin = client({
      notification_tipos: [{ data: { disponivel: true, padrao_ativo: true } }],
      notification_tokens: [{ error: { message: "Conexão indisponível" } }],
    });
    await expect(dispatchNotification(admin as never, args)).rejects.toThrow("Conexão indisponível");
    expect(sendFcmMessage).not.toHaveBeenCalled();
  });

  it.each([unregisterDeviceToken, removeDeviceById])("não confirma uma remoção que falhou", async (fn) => {
    const supabase = client({ notification_tokens: [{ error: { message: "Falha na remoção" } }] });
    const handler = fn as unknown as (input: unknown) => Promise<unknown>;
    await expect(handler({ data: { id: "device", token: "device-token" }, context: { supabase, userId: "user" } }))
      .rejects.toThrow("Falha na remoção");
  });

  it("não mostra preferências incompletas quando uma leitura falha", async () => {
    const supabase = client({ notification_preferencias: [{ error: { message: "Falha nas preferências" } }] });
    const handler = listNotificationSettings as unknown as (input: unknown) => Promise<unknown>;
    await expect(handler({ context: { supabase, userId: "user" } })).rejects.toThrow("Falha nas preferências");
  });

  it("um usuário comum não pode disparar avisos de negócio nem para si", async () => {
    const supabase = client({ user_roles: [{ data: null }] });
    const handler = dispatchNotificationFn as unknown as (input: unknown) => Promise<unknown>;
    await expect(handler({ data: args, context: { supabase, userId: args.userId } })).rejects.toThrow("forbidden");
    expect(sendFcmMessage).not.toHaveBeenCalled();
  });
});