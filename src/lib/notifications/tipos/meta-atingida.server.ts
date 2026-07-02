import type { NotificationTipo } from "../registry.server";

type Ctx = { id: string; titulo: string; valor: number };

export const tipoMetaAtingida: NotificationTipo<Ctx> = {
  codigo: "meta_atingida",
  titulo: (c) => `Meta atingida: ${c.titulo}`,
  corpo: (c) => `Parabéns! Você alcançou R$ ${c.valor.toFixed(2)}.`,
  clickPath: () => "/financeiro/metas",
  // Disparo geralmente inline quando o progresso cruza 100% no app.
  // O scan diário funciona como rede de segurança: metas com valor_atual >= valor_alvo
  // ainda não notificadas serão enviadas uma vez (dedup pelo id).
  scan: async (admin) => {
    const { data, error } = await admin
      .from("metas_financeiras")
      .select("id, user_id, titulo, valor_alvo, valor_atual")
      .not("valor_atual", "is", null)
      .not("valor_alvo", "is", null);
    if (error) {
      console.error("[notif meta_atingida] scan erro", error);
      return [];
    }
    return (data ?? [])
      .filter((m) => Number(m.valor_atual) >= Number(m.valor_alvo) && Number(m.valor_alvo) > 0)
      .map((m) => ({
        userId: m.user_id as string,
        dedupKey: `meta:${m.id}`,
        contexto: {
          id: m.id,
          titulo: (m.titulo as string) ?? "Meta",
          valor: Number(m.valor_alvo) || 0,
        },
      }));
  },
};
