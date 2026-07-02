import type { NotificationTipo } from "../registry.server";

type Ctx = { id: string; origem: string; valor: number; data_prevista: string };

export const tipoRecebimentoProximo: NotificationTipo<Ctx> = {
  codigo: "recebimento_proximo",
  titulo: (c) => `Recebimento amanhã: R$ ${c.valor.toFixed(2)}`,
  corpo: (c) => `${c.origem} — vence em ${new Date(c.data_prevista).toLocaleDateString("pt-BR")}`,
  clickPath: () => "/recebimentos",
  scan: async (admin) => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const ymd = amanha.toISOString().slice(0, 10);
    const { data, error } = await admin
      .from("recebimentos")
      .select("id, user_id, origem, valor, data_prevista, status")
      .eq("data_prevista", ymd)
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
        origem: (r.origem as string) ?? "Recebimento",
        valor: Number(r.valor) || 0,
        data_prevista: r.data_prevista as string,
      },
    }));
  },
};
