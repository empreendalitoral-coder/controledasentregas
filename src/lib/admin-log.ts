import { supabase } from "@/integrations/supabase/client";

export type AdminAcao =
  | "aprovacao_premium"
  | "recusa_premium"
  | "renovacao_premium"
  | "alteracao_validade"
  | "liberacao_manual"
  | "acesso_nao_autorizado";

export async function registrarLogAdmin(acao: AdminAcao, detalhes?: Record<string, unknown>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  if (acao === "acesso_nao_autorizado") {
    // Non-admins use a SECURITY DEFINER RPC so they can flag unauthorized access
    // without holding direct INSERT privileges on logs_admin.
    await supabase.rpc("registrar_acesso_nao_autorizado", {
      _detalhes: (detalhes ?? null) as never,
    });
    return;
  }
  await supabase.from("logs_admin").insert({
    user_id: u.user.id,
    acao,
    detalhes: (detalhes ?? null) as never,
  });
}
