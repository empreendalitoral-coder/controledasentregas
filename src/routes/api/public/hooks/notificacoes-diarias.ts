import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint chamado por pg_cron diariamente às 08:00 BRT (11:00 UTC).
 * Varre todos os tipos com `scan()` no registry e dispara envios para os eventos encontrados.
 * Autenticação: header `x-cron-secret` com o token privado de servidor.
 */
export const Route = createFileRoute("/api/public/hooks/notificacoes-diarias")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { assertCronRequest } = await import("@/lib/cron-auth.server");
        const denied = await assertCronRequest(request);
        if (denied) return denied;


        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { listTiposComScan } = await import("@/lib/notifications/registry.server");
        const { dispatchNotification } = await import("@/lib/notifications/send.functions");

        const tipos = listTiposComScan();
        const resumo: Record<string, { total: number; enviados: number; falhas: number }> = {};

        for (const tipo of tipos) {
          const eventos = (await tipo.scan!(supabaseAdmin)) ?? [];
          const r = { total: eventos.length, enviados: 0, falhas: 0 };
          for (const ev of eventos) {
            const res = await dispatchNotification(supabaseAdmin, {
              userId: ev.userId,
              tipoCodigo: tipo.codigo,
              contexto: ev.contexto,
              dedupKey: ev.dedupKey,
            });
            if (res.ok) r.enviados += 1;
            else r.falhas += 1;
          }
          resumo[tipo.codigo] = r;
        }

        return new Response(JSON.stringify({ ok: true, resumo }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
