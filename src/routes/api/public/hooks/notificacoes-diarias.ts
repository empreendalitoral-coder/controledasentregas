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
        const resumo: Record<string, { total: number; enviados: number; ignorados: number; falhas: number }> = {};

        for (const tipo of tipos) {
          if (!tipo.scan) continue;
          const r = { total: 0, enviados: 0, ignorados: 0, falhas: 0 };
          resumo[tipo.codigo] = r;
          let eventos;
          try {
            eventos = await tipo.scan(supabaseAdmin);
            r.total = eventos.length;
          } catch (error) {
            console.error("[notif cron] falha na varredura", tipo.codigo, error);
            r.falhas += 1;
            continue;
          }
          for (const ev of eventos) {
            try {
              const res = await dispatchNotification(supabaseAdmin, {
              userId: ev.userId,
              tipoCodigo: tipo.codigo,
              contexto: ev.contexto,
              dedupKey: ev.dedupKey,
            });
              if (!res.ok) r.falhas += 1;
              else if (res.skipped) r.ignorados += 1;
              else r.enviados += 1;
            } catch (error) {
              console.error("[notif cron] falha no envio", tipo.codigo, error);
              r.falhas += 1;
            }
          }
          resumo[tipo.codigo] = r;
        }

        const ok = Object.values(resumo).every((r) => r.falhas === 0);
        return new Response(JSON.stringify({ ok, resumo }), {
          status: ok ? 200 : 500,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
