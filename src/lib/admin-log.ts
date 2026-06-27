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
  await supabase.from("logs_admin").insert({
    user_id: u.user.id,
    acao,
    detalhes: (detalhes ?? null) as never,
  });
}
