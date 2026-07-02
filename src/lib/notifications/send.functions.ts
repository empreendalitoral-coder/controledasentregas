/**
 * Server functions do sistema de notificações:
 * - registerDeviceToken: chamada pelo cliente Capacitor para salvar o token FCM.
 * - unregisterDeviceToken: remove um token.
 * - listNotificationSettings: retorna tipos disponíveis + preferências do usuário.
 * - updateNotificationPreference: liga/desliga um tipo específico.
 * - dispatchNotificationInternal (INTERNO): usada por outras server fns para enviar.
 *   Não é exposta ao cliente por design — envios são gatilhados por regras de negócio,
 *   não por ação direta do usuário.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const registerDeviceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        token: z.string().min(10).max(4096),
        plataforma: z.enum(["android", "ios", "web"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const admin = await loadAdmin();
    const { error } = await admin
      .from("notification_tokens")
      .upsert(
        {
          user_id: context.userId,
          token: data.token,
          plataforma: data.plataforma,
          ultimo_uso: new Date().toISOString(),
        },
        { onConflict: "token" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unregisterDeviceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ token: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    const admin = await loadAdmin();
    await admin
      .from("notification_tokens")
      .delete()
      .eq("user_id", context.userId)
      .eq("token", data.token);
    return { ok: true };
  });

export const listNotificationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await loadAdmin();
    const [tiposRes, prefRes, tokensRes] = await Promise.all([
      admin
        .from("notification_tipos")
        .select("codigo, titulo, descricao, categoria, padrao_ativo, apenas_admin, disponivel")
        .eq("disponivel", true),
      admin
        .from("notification_preferencias")
        .select("tipo_codigo, ativo")
        .eq("user_id", context.userId),
      admin
        .from("notification_tokens")
        .select("id, plataforma, ultimo_uso, created_at")
        .eq("user_id", context.userId)
        .order("ultimo_uso", { ascending: false }),
    ]);

    // Descobre se é admin para filtrar tipos apenas_admin
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    const prefMap = new Map((prefRes.data ?? []).map((p) => [p.tipo_codigo, p.ativo]));
    const tipos = (tiposRes.data ?? [])
      .filter((t) => !t.apenas_admin || isAdmin)
      .map((t) => ({
        ...t,
        ativo: prefMap.has(t.codigo) ? Boolean(prefMap.get(t.codigo)) : Boolean(t.padrao_ativo),
      }));

    return { tipos, dispositivos: tokensRes.data ?? [] };
  });

export const updateNotificationPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ tipo_codigo: z.string(), ativo: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const admin = await loadAdmin();
    const { error } = await admin
      .from("notification_preferencias")
      .upsert(
        {
          user_id: context.userId,
          tipo_codigo: data.tipo_codigo,
          ativo: data.ativo,
        },
        { onConflict: "user_id,tipo_codigo" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeDeviceById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const admin = await loadAdmin();
    await admin
      .from("notification_tokens")
      .delete()
      .eq("user_id", context.userId)
      .eq("id", data.id);
    return { ok: true };
  });

/**
 * Envio real de notificação. Chamada por outras server fns / server routes.
 * Não é exposta ao cliente como RPC — envios são consequência de regras de negócio.
 *
 * Uso:
 *   await dispatchNotification(admin, { userId, tipoCodigo, contexto, dedupKey })
 */
export async function dispatchNotification(
  admin: Awaited<ReturnType<typeof loadAdmin>>,
  args: {
    userId: string;
    tipoCodigo: string;
    contexto: Record<string, unknown>;
    dedupKey: string;
  },
): Promise<{ ok: boolean; skipped?: string; erro?: string }> {
  const { userId, tipoCodigo, contexto, dedupKey } = args;

  // 1. Registry do tipo
  const { getTipo } = await import("./registry.server");
  const tipo = getTipo(tipoCodigo);
  if (!tipo) return { ok: false, skipped: "tipo_desconhecido" };

  // 2. Dedup: já enviado?
  const { data: jaEnviado } = await admin
    .from("notification_envios")
    .select("id")
    .eq("user_id", userId)
    .eq("chave_dedup", dedupKey)
    .maybeSingle();
  if (jaEnviado) return { ok: true, skipped: "duplicado" };

  // 3. Preferência do usuário
  const { data: pref } = await admin
    .from("notification_preferencias")
    .select("ativo")
    .eq("user_id", userId)
    .eq("tipo_codigo", tipoCodigo)
    .maybeSingle();
  if (pref && pref.ativo === false) {
    await admin.from("notification_envios").insert({
      user_id: userId,
      tipo_codigo: tipoCodigo,
      chave_dedup: dedupKey,
      sucesso: false,
      erro: "opt_out",
    });
    return { ok: true, skipped: "opt_out" };
  }

  // 4. Renderiza
  const titulo = tipo.titulo(contexto as never);
  const corpo = tipo.corpo(contexto as never);

  // 5. Tokens do usuário
  const { data: tokens } = await admin
    .from("notification_tokens")
    .select("id, token")
    .eq("user_id", userId);
  if (!tokens || tokens.length === 0) {
    await admin.from("notification_envios").insert({
      user_id: userId,
      tipo_codigo: tipoCodigo,
      chave_dedup: dedupKey,
      titulo,
      corpo,
      sucesso: false,
      erro: "sem_tokens",
    });
    return { ok: true, skipped: "sem_tokens" };
  }

  // 6. Envia
  const { sendFcmMessage, isFcmConfigured } = await import("@/lib/fcm.server");
  if (!isFcmConfigured()) {
    console.warn("[notif] FCM não configurado — registrando log sem enviar", { tipoCodigo, userId });
    await admin.from("notification_envios").insert({
      user_id: userId,
      tipo_codigo: tipoCodigo,
      chave_dedup: dedupKey,
      titulo,
      corpo,
      sucesso: false,
      erro: "fcm_nao_configurado",
    });
    return { ok: false, skipped: "fcm_nao_configurado" };
  }

  const data: Record<string, string> = { tipo: tipoCodigo, dedup: dedupKey };
  if (tipo.clickPath) data.path = tipo.clickPath(contexto as never);

  let sucesso = false;
  let erro: string | undefined;
  const invalidos: string[] = [];

  await Promise.all(
    tokens.map(async (t) => {
      const r = await sendFcmMessage({ token: t.token, title: titulo, body: corpo, data });
      if (r.ok) {
        sucesso = true;
      } else {
        if (r.invalidToken) invalidos.push(t.token);
        if (!erro) erro = r.error;
      }
    }),
  );

  if (invalidos.length) {
    await admin.from("notification_tokens").delete().in("token", invalidos);
  }

  await admin.from("notification_envios").insert({
    user_id: userId,
    tipo_codigo: tipoCodigo,
    chave_dedup: dedupKey,
    titulo,
    corpo,
    sucesso,
    erro: sucesso ? null : erro ?? "falha_desconhecida",
  });

  return { ok: sucesso, erro };
}

/** Server fn expondo o dispatch a chamadores autenticados de mesmo user_id ou admin. */
export const dispatchNotificationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        userId: z.string().uuid(),
        tipoCodigo: z.string(),
        contexto: z.record(z.string(), z.unknown()),
        dedupKey: z.string().min(1).max(200),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const admin = await loadAdmin();
    // Autoriza: dono OU admin
    if (data.userId !== context.userId) {
      const { data: isAdmin } = await admin.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("forbidden");
    }
    return dispatchNotification(admin, data);
  });

/** Envio para todos os admins (usado em nova_solicitacao_premium). */
export async function dispatchToAdmins(
  admin: Awaited<ReturnType<typeof loadAdmin>>,
  args: { tipoCodigo: string; contexto: Record<string, unknown>; dedupKey: string },
) {
  const { data } = await admin.from("administradores").select("user_id").eq("ativo", true);
  if (!data) return;
  await Promise.all(
    data.map((a) =>
      dispatchNotification(admin, {
        userId: a.user_id as string,
        tipoCodigo: args.tipoCodigo,
        contexto: args.contexto,
        dedupKey: `${args.dedupKey}:${a.user_id}`,
      }),
    ),
  );
}
