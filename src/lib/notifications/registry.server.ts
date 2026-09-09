/**
 * Registry modular de tipos de notificação.
 * Adicionar um tipo novo = criar um arquivo em `tipos/` e registrar aqui.
 * Zero mudança na arquitetura do envio.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ScanEvento = {
  userId: string;
  contexto: Record<string, unknown>;
  dedupKey: string;
};

export type NotificationTipo<Ctx = Record<string, unknown>> = {
  codigo: string;
  titulo: (ctx: Ctx) => string;
  corpo: (ctx: Ctx) => string;
  /** Se presente, é varrido diariamente pelo cron. */
  scan?: (admin: SupabaseClient) => Promise<ScanEvento[]>;
  /** Rota (client-side) que o app abre ao tocar na notificação. */
  clickPath?: (ctx: Ctx) => string;
};

import { tipoRecebimentoProximo } from "./tipos/recebimento-proximo.server";
import { tipoMetaAtingida } from "./tipos/meta-atingida.server";
import { tipoPremiumVencendo } from "./tipos/premium-vencendo.server";
import { tipoPixAprovado } from "./tipos/pix-aprovado.server";
import { tipoNovaSolicitacaoPremium } from "./tipos/nova-solicitacao-premium.server";
import { tipoAvisoAdmin } from "./tipos/aviso-admin.server";
import { tipoLembreteLancamento } from "./tipos/lembrete-lancamento.server";

const TIPOS: NotificationTipo[] = [
  tipoRecebimentoProximo as NotificationTipo,
  tipoMetaAtingida as NotificationTipo,
  tipoPremiumVencendo as NotificationTipo,
  tipoPixAprovado as NotificationTipo,
  tipoNovaSolicitacaoPremium as NotificationTipo,
  tipoAvisoAdmin as NotificationTipo,
  tipoLembreteLancamento as NotificationTipo,
];

const byCodigo = new Map(TIPOS.map((t) => [t.codigo, t]));

export function getTipo(codigo: string): NotificationTipo | undefined {
  return byCodigo.get(codigo);
}

export function listTiposComScan(): NotificationTipo[] {
  return TIPOS.filter((t) => typeof t.scan === "function");
}
