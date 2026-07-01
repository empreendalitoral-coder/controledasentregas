import { createFileRoute } from "@tanstack/react-router";

/**
 * Rota chamada por pg_cron diariamente para apagar em definitivo contas
 * cujo período de 30 dias de exclusão já venceu.
 *
 * Autenticação: header `apikey` deve conter a SUPABASE_PUBLISHABLE_KEY (padrão
 * pg_cron do Lovable). O corpo pode ser vazio.
 */
export const Route = createFileRoute("/api/public/hooks/purge-contas")({
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

        // Busca contas cujo prazo de 30 dias venceu e que ainda não foram purgadas.
        const { data: pendentes, error: errList } = await supabaseAdmin
          .from("contas_excluidas")
          .select("user_id")
          .lte("purge_em", new Date().toISOString())
          .is("purgada_em", null)
          .limit(100);

        if (errList) {
          console.error("[purge-contas] erro listando", errList);
          return new Response(JSON.stringify({ error: errList.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const tabelas = [
          "lancamentos", "recebimentos", "abastecimentos", "manutencoes",
          "contas_fixas", "cartoes_credito", "cartao_lancamentos",
          "fluxo_caixa", "metas_financeiras", "pix_recebidos", "pix_enviados",
          "solicitacoes_premium", "usuarios_premium", "user_roles",
        ] as const;

        let purgados = 0;
        const erros: Array<{ user_id: string; erro: string }> = [];

        for (const row of pendentes ?? []) {
          const uid = row.user_id;
          try {
            for (const t of tabelas) {
              await supabaseAdmin.from(t).delete().eq("user_id", uid);
            }
            await supabaseAdmin.from("profiles").delete().eq("id", uid);
            await supabaseAdmin
              .from("contas_excluidas")
              .update({ purgada_em: new Date().toISOString() })
              .eq("user_id", uid);

            const { error: errDel } = await supabaseAdmin.auth.admin.deleteUser(uid);
            if (errDel) throw errDel;

            purgados += 1;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[purge-contas] falha", uid, msg);
            erros.push({ user_id: uid, erro: msg });
          }
        }

        return new Response(
          JSON.stringify({ ok: true, purgados, pendentes: pendentes?.length ?? 0, erros }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
