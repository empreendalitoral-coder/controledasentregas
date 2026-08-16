import type { NotificationTipo } from "../registry.server";

type Ctx = { titulo: string; mensagem: string };

export const tipoAvisoAdmin: NotificationTipo<Ctx> = {
  codigo: "aviso_admin",
  titulo: (c) => c.titulo,
  corpo: (c) => c.mensagem,
  clickPath: () => "/",
  // Sem scan: disparado manualmente pelo painel administrativo.
};
