import type { NotificationTipo } from "../registry.server";

type Ctx = { nome: string; plano: string; valor: number };

export const tipoNovaSolicitacaoPremium: NotificationTipo<Ctx> = {
  codigo: "nova_solicitacao_premium",
  titulo: () => "Nova solicitação Premium",
  corpo: (c) => `${c.nome} — plano ${c.plano} (R$ ${c.valor.toFixed(2)})`,
  clickPath: () => "/admin/solicitacoes",
  // Disparado inline no INSERT; enviado a todos os admins ativos (resolvido no server fn).
};
