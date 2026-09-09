import type { NotificationTipo } from "../registry.server";

type Ctx = { data: string };

/**
 * Lembrete diário: avisa quem não registrou o dia anterior.
 * Varrido pelo cron das 08:00 BRT.
 */
export const tipoLembreteLancamento: NotificationTipo<Ctx> = {
  codigo: "lembrete_lancamento",
  titulo: () => "Você não registrou ontem",
  corpo: (c) =>
    `Registre o dia ${new Date(c.data + "T00:00:00").toLocaleDateString("pt-BR")} para manter suas contas em dia.`,
  clickPath: () => "/lancamento/novo",
  scan: async (admin) => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const ymd = ontem.toISOString().slice(0, 10);

    const { data: tokens, error: errTokens } = await admin
      .from("notification_tokens")
      .select("user_id");
    if (errTokens) {
      console.error("[notif lembrete_lancamento] tokens erro", errTokens);
      return [];
    }
    const userIds = [...new Set((tokens ?? []).map((t) => t.user_id as string))];
    if (userIds.length === 0) return [];

    const { data: lancs, error } = await admin
      .from("lancamentos")
      .select("user_id")
      .eq("data", ymd)
      .in("user_id", userIds);
    if (error) {
      console.error("[notif lembrete_lancamento] scan erro", error);
      return [];
    }
    const comLancamento = new Set((lancs ?? []).map((l) => l.user_id as string));

    return userIds
      .filter((uid) => !comLancamento.has(uid))
      .map((uid) => ({
        userId: uid,
        dedupKey: `lembrete_lancamento:${uid}:${ymd}`,
        contexto: { data: ymd },
      }));
  },
};
