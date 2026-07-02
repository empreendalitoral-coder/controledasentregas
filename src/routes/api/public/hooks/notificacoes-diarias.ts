import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint chamado por pg_cron diariamente às 08:00 BRT (11:00 UTC).
 * Varre todos os tipos com `scan()` no registry e dispara envios para os eventos encontrados.
 * Autenticação: header `apikey` deve conter a SUPABASE_PUBLISHABLE_KEY.
 */
export const Route = createFileRoute("/api/public/hooks/notificacoes-diarias")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

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
