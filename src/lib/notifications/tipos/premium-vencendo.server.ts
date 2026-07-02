import type { NotificationTipo } from "../registry.server";

type Ctx = { data_validade: string; dias: number };

export const tipoPremiumVencendo: NotificationTipo<Ctx> = {
  codigo: "premium_vencendo",
  titulo: (c) => `Premium vence em ${c.dias} dia${c.dias === 1 ? "" : "s"}`,
  corpo: (c) => `Renove antes de ${new Date(c.data_validade).toLocaleDateString("pt-BR")} para não perder acesso.`,
  clickPath: () => "/premium",
  scan: async (admin) => {
    const alvo = new Date();
    alvo.setDate(alvo.getDate() + 7);
    const ymd = alvo.toISOString().slice(0, 10);
    const inicio = `${ymd}T00:00:00Z`;
    const fim = `${ymd}T23:59:59Z`;
    const { data, error } = await admin
      .from("usuarios_premium")
      .select("user_id, data_validade, plano, ativo")
      .eq("ativo", true)
      .neq("plano", "teste")
      .gte("data_validade", inicio)
      .lte("data_validade", fim);
    if (error) {
      console.error("[notif premium_vencendo] scan erro", error);
      return [];
    }
    return (data ?? []).map((u) => ({
      userId: u.user_id as string,
      dedupKey: `premium:${u.user_id}:${ymd}`,
      contexto: { data_validade: u.data_validade as string, dias: 7 },
    }));
  },
};
