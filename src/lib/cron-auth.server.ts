/**
 * Autenticação das rotas de cron (`/api/public/hooks/*`).
 *
 * A chave publicável do Supabase NÃO serve como segredo: ela é embutida no
 * bundle do navegador. Aqui usamos um token exclusivo de servidor, guardado em
 * `private.cron_tokens` (sem acesso para anon/authenticated). A variável antiga
 * CRON_SECRET não é aceita: a rotação no banco deve invalidar toda credencial anterior.
 */
export async function assertCronRequest(request: Request): Promise<Response | null> {
  const unauthorized = new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });

  const provided = request.headers.get("x-cron-secret") ?? "";
  if (!provided) return unauthorized;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("cron_token_valido", { _token: provided });
    if (error) {
      console.error("[cron-auth] falha ao validar token", error);
      return unauthorized;
    }
    if (data === true) return null;
  } catch (e) {
    console.error("[cron-auth] erro inesperado", e);
  }

  return unauthorized;
}
