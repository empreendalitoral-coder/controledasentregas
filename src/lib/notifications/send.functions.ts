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
  .inputValidator((raw) => z.object({ token: z.string().min(10).max(4096) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notification_tokens")
      .delete()
      .eq("user_id", context.userId)
      .eq("token", data.token);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listNotificationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = context.supabase;
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

    // Descobre se é admin para filtrar tipos apenas_admin (service role bypassa RLS)
    const { data: adminRow, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = Boolean(adminRow);
    for (const result of [tiposRes, prefRes, tokensRes]) {
      if (result.error) throw new Error(result.error.message);
    }
    if (roleError) throw new Error(roleError.message);

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
    z.object({ tipo_codigo: z.string().min(1).max(100), ativo: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const admin = context.supabase;
    const { data: tipo, error: typeError } = await admin.from("notification_tipos")
      .select("disponivel, apenas_admin").eq("codigo", data.tipo_codigo).maybeSingle();
    if (typeError) throw new Error(typeError.message);
    if (!tipo?.disponivel) throw new Error("Tipo de notificação indisponível");
    if (tipo.apenas_admin) {
      const { data: role, error: roleError } = await admin.from("user_roles")
        .select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
      if (roleError) throw new Error(roleError.message);
      if (!role) throw new Error("Acesso restrito aos administradores");
    }
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
    const { error } = await context.supabase
      .from("notification_tokens")
      .delete()
      .eq("user_id", context.userId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
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
  const { data: jaEnviado, error: dedupError } = await admin
    .from("notification_envios")
    .select("id")
    .eq("user_id", userId)
    .eq("chave_dedup", dedupKey)
    .maybeSingle();
  if (dedupError) throw new Error(dedupError.message);
  if (jaEnviado) return { ok: true, skipped: "duplicado" };

  const { data: config, error: configError } = await admin.from("notification_tipos")
    .select("disponivel, padrao_ativo, apenas_admin").eq("codigo", tipoCodigo).maybeSingle();
  if (configError) throw new Error(configError.message);
  if (!config?.disponivel) return { ok: true, skipped: "tipo_indisponivel" };
  if (config.apenas_admin) {
    const { data: role, error: roleError } = await admin.from("user_roles")
      .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (roleError) throw new Error(roleError.message);
    if (!role) return { ok: true, skipped: "apenas_admin" };
  }

  // 3. Preferência do usuário
  const { data: pref, error: prefError } = await admin
    .from("notification_preferencias")
    .select("ativo")
    .eq("user_id", userId)
    .eq("tipo_codigo", tipoCodigo)
    .maybeSingle();
  if (prefError) throw new Error(prefError.message);
  if (!(pref?.ativo ?? config.padrao_ativo)) {
    const { error } = await admin.from("notification_envios").insert({
      user_id: userId,
      tipo_codigo: tipoCodigo,
      chave_dedup: dedupKey,
      sucesso: false,
      erro: "opt_out",
    });
    if (error) throw new Error(error.message);
    return { ok: true, skipped: "opt_out" };
  }

  // 4. Renderiza
  const titulo = tipo.titulo(contexto as never);
  const corpo = tipo.corpo(contexto as never);

  // 5. Tokens do usuário
  const { data: tokens, error: tokensError } = await admin
    .from("notification_tokens")
    .select("id, token")
    .eq("user_id", userId);
  if (tokensError) throw new Error(tokensError.message);
  if (!tokens || tokens.length === 0) {
    const { error } = await admin.from("notification_envios").insert({
      user_id: userId,
      tipo_codigo: tipoCodigo,
      chave_dedup: dedupKey,
      titulo,
      corpo,
      sucesso: false,
      erro: "sem_tokens",
    });
    if (error) throw new Error(error.message);
    return { ok: true, skipped: "sem_tokens" };
  }

  // 6. Envia
  const { sendFcmMessage, isFcmConfigured } = await import("@/lib/fcm.server");
  if (!isFcmConfigured()) {
    console.warn("[notif] FCM não configurado — registrando log sem enviar", { tipoCodigo, userId });
    const { error } = await admin.from("notification_envios").insert({
      user_id: userId,
      tipo_codigo: tipoCodigo,
      chave_dedup: dedupKey,
      titulo,
      corpo,
      sucesso: false,
      erro: "fcm_nao_configurado",
    });
    if (error) throw new Error(error.message);
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
    const { error } = await admin.from("notification_tokens").delete().eq("user_id", userId).in("token", invalidos);
    if (error) throw new Error(error.message);
  }

  const { error: logError } = await admin.from("notification_envios").insert({
    user_id: userId,
    tipo_codigo: tipoCodigo,
    chave_dedup: dedupKey,
    titulo,
    corpo,
    sucesso,
    erro: sucesso ? null : erro ?? "falha_desconhecida",
  });
  if (logError) throw new Error(logError.message);

  return { ok: sucesso, erro };
}

/** Business notification dispatch is restricted to administrators. */
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
    const { data: adminRow, error: roleError } = await context.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle();
    if (roleError) throw new Error(roleError.message);
    if (!adminRow) throw new Error("forbidden");
    const admin = await loadAdmin();
    return dispatchNotification(admin, data);
  });

/** Envio para todos os admins (usado em nova_solicitacao_premium). */
export async function dispatchToAdmins(
  admin: Awaited<ReturnType<typeof loadAdmin>>,
  args: { tipoCodigo: string; contexto: Record<string, unknown>; dedupKey: string },
) {
  const { data, error } = await admin.from("administradores").select("user_id").eq("ativo", true);
  if (error) throw new Error(error.message);
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
