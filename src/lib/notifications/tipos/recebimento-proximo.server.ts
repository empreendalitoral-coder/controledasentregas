import type { NotificationTipo } from "../registry.server";

type Ctx = { id: string; nome_periodo: string; valor_recebido?: number; data_pagamento: string };

export const tipoRecebimentoProximo: NotificationTipo<Ctx> = {
  codigo: "recebimento_proximo",
  titulo: (c) => c.valor_recebido == null
    ? "Recebimento previsto para amanhã"
    : `Recebimento amanhã: ${c.valor_recebido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
  corpo: (c) => `${c.nome_periodo} — pagamento em ${new Date(`${c.data_pagamento}T00:00:00`).toLocaleDateString("pt-BR")}`,
  clickPath: () => "/recebimentos",
  scan: async (admin) => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const ymd = amanha.toISOString().slice(0, 10);
    const { data, error } = await admin
      .from("recebimentos")
      .select("id, user_id, nome_periodo, valor_recebido, data_pagamento, status")
      .eq("data_pagamento", ymd)
      .neq("status", "recebido");
    if (error) {
      console.error("[notif recebimento_proximo] scan erro", error);
      return [];
    }
    return (data ?? []).map((r) => ({
      userId: r.user_id as string,
      dedupKey: `recebimento:${r.id}:${ymd}`,
      contexto: {
        id: r.id,
        nome_periodo: r.nome_periodo as string,
        valor_recebido: r.valor_recebido == null ? undefined : Number(r.valor_recebido),
        data_pagamento: r.data_pagamento as string,
      },
    }));
  },
};
