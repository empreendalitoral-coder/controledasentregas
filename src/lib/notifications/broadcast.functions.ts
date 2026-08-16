/**
 * Envio em massa (mensagem do administrador para todos os usuários).
 * Autorização: apenas usuários ativos na tabela `administradores`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const broadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        titulo: z.string().min(1).max(120),
        mensagem: z.string().min(1).max(500),
        somenteComDispositivo: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    // Checagem de admin com o cliente do próprio usuário (RLS), evitando erros crus do banco.
    const { data: adminRow } = await context.supabase
      .from("administradores")
      .select("id")
      .eq("user_id", context.userId)
      .eq("ativo", true)
      .maybeSingle();
    if (!adminRow) throw new Error("Apenas administradores podem enviar mensagens.");

    const admin = await loadAdmin();
    const { dispatchNotification } = await import("./send.functions");

    const { isFcmConfigured } = await import("@/lib/fcm.server");
    if (!isFcmConfigured()) {
      return {
        ok: false,
        destinatarios: 0,
        enviados: 0,
        falhas: 0,
        ignorados: 0,
        motivo: "As notificações push ainda não estão configuradas no servidor.",
      };
    }

    // Destinatários: usuários com pelo menos um dispositivo registrado.
    const { data: tokens, error } = await admin
      .from("notification_tokens")
      .select("user_id");
    if (error) {
      return {
        ok: false,
        destinatarios: 0,
        enviados: 0,
        falhas: 0,
        ignorados: 0,
        motivo: "Não foi possível ler os dispositivos registrados. Tente novamente.",
      };
    }
    const userIds = Array.from(new Set((tokens ?? []).map((t) => t.user_id as string)));

    if (userIds.length === 0) {
      return {
        ok: false,
        destinatarios: 0,
        enviados: 0,
        falhas: 0,
        ignorados: 0,
        motivo:
          "Nenhum aparelho registrado ainda. As notificações só funcionam no app Android instalado, com as notificações permitidas.",
      };
    }


    const dedupBase = `aviso_admin:${Date.now()}`;
    let enviados = 0;
    let falhas = 0;
    let ignorados = 0;

    for (const uid of userIds) {
      const r = await dispatchNotification(admin, {
        userId: uid,
        tipoCodigo: "aviso_admin",
        contexto: { titulo: data.titulo, mensagem: data.mensagem },
        dedupKey: `${dedupBase}:${uid}`,
      });
      if (r.skipped) ignorados += 1;
      else if (r.ok) enviados += 1;
      else falhas += 1;
    }

    return { ok: enviados > 0, destinatarios: userIds.length, enviados, falhas, ignorados };
  });
