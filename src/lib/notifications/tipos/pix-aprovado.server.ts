import type { NotificationTipo } from "../registry.server";

type Ctx = { plano: string; valor: number };

export const tipoPixAprovado: NotificationTipo<Ctx> = {
  codigo: "pix_aprovado",
  titulo: () => "Premium liberado!",
  corpo: (c) => `Sua solicitação (${c.plano}, R$ ${c.valor.toFixed(2)}) foi aprovada.`,
  clickPath: () => "/premium",
  // Sem scan: sempre disparado inline quando o admin aprova.
};
