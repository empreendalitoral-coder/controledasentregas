/**
 * Server fns para telas de gestão/diagnóstico de notificações do próprio usuário:
 * - listNotificationLogs / clearNotificationLogs
 * - sendTestNotification (para um token específico OU todos os do usuário)
 * - getFirebaseDiagnostics
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listNotificationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await loadAdmin();
    const { data, error } = await admin
      .from("notification_envios")
      .select("id, tipo_codigo, titulo, corpo, sucesso, erro, enviado_em")
      .eq("user_id", context.userId)
      .order("enviado_em", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { logs: data ?? [] };
  });

export const clearNotificationLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await loadAdmin();
    const { error } = await admin
      .from("notification_envios")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        titulo: z.string().min(1).max(120),
        mensagem: z.string().min(1).max(500),
        escopo: z.enum(["dispositivo", "todos"]),
        token: z.string().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const admin = await loadAdmin();
    const { sendFcmMessage, isFcmConfigured } = await import("@/lib/fcm.server");

    if (!isFcmConfigured()) {
      return {
        ok: false,
        enviados: 0,
        falhas: 0,
        erros: ["Firebase não configurado no servidor (FIREBASE_SERVICE_ACCOUNT_JSON ausente)"],
      };
    }

    let query = admin
      .from("notification_tokens")
      .select("id, token")
      .eq("user_id", context.userId);
    if (data.escopo === "dispositivo" && data.token) {
      query = query.eq("token", data.token);
    }
    const { data: tokens, error } = await query;
    if (error) throw new Error(error.message);
    if (!tokens || tokens.length === 0) {
      return {
        ok: false,
        enviados: 0,
        falhas: 0,
        erros: ["Nenhum dispositivo registrado para este usuário"],
      };
    }

    let enviados = 0;
    let falhas = 0;
    const erros: string[] = [];
    const invalidos: string[] = [];

    await Promise.all(
      tokens.map(async (t) => {
        const r = await sendFcmMessage({
          token: t.token,
          title: data.titulo,
          body: data.mensagem,
          data: { tipo: "teste", origem: "diagnostico" },
        });
        if (r.ok) enviados += 1;
        else {
          falhas += 1;
          if (r.invalidToken) invalidos.push(t.token);
          if (r.error && erros.length < 5) erros.push(r.error);
        }
      }),
    );

    if (invalidos.length) {
      await admin.from("notification_tokens").delete().in("token", invalidos);
    }

    await admin.from("notification_envios").insert({
      user_id: context.userId,
      tipo_codigo: "teste_manual",
      chave_dedup: `teste:${context.userId}:${Date.now()}`,
      titulo: data.titulo,
      corpo: data.mensagem,
      sucesso: enviados > 0,
      erro: enviados > 0 ? null : erros[0] ?? "falha_desconhecida",
    });

    return { ok: enviados > 0, enviados, falhas, erros };
  });

export const getFirebaseDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await loadAdmin();
    const { isFcmConfigured } = await import("@/lib/fcm.server");
    const fcmConfigured = isFcmConfigured();

    const projectId = (() => {
      try {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (!raw) return null;
        return (JSON.parse(raw) as { project_id?: string }).project_id ?? null;
      } catch {
        return null;
      }
    })();

    const { count: tokensCount } = await admin
      .from("notification_tokens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", context.userId);

    const isProd = process.env.NODE_ENV === "production";

    return {
      firebaseInicializado: fcmConfigured,
      fcmConectado: fcmConfigured,
      projectId,
      tokensRegistrados: tokensCount ?? 0,
      ambiente: isProd ? "producao" : "desenvolvimento",
    };
  });
