import { supabase } from "@/integrations/supabase/client";

export type UnifiedRow = {
  id: string;
  data: string; // YYYY-MM-DD
  tipo: "entrada" | "saida";
  categoria: string;
  descricao: string;
  valor: number;
  origem:
    | "lancamento"
    | "recebimento"
    | "pix_recebido"
    | "pix_enviado"
    | "abastecimento"
    | "manutencao"
    | "pnr"
    | "perdidos"
    | "conta_fixa"
    | "cartao"
    | "fluxo_manual";
};

export type AggregateOptions = {
  start?: string; // YYYY-MM-DD inclusive
  end?: string;   // YYYY-MM-DD inclusive
};

function inRange(date: string, opt: AggregateOptions): boolean {
  if (opt.start && date < opt.start) return false;
  if (opt.end && date > opt.end) return false;
  return true;
}

/**
 * Agrega TODOS os movimentos financeiros do usuário a partir das tabelas
 * operacionais (lancamentos, recebimentos, abastecimentos, manutencoes,
 * pix_*, contas_fixas, cartao_lancamentos) e dos lançamentos manuais
 * (fluxo_caixa). Não grava nada — sempre lê em tempo real.
 */
export async function loadFinanceiroUnificado(opt: AggregateOptions = {}): Promise<UnifiedRow[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const uid = u.user.id;

  const [lanc, rec, pixR, pixE, abast, man, contas, cart, fluxo] = await Promise.all([
    supabase.from("lancamentos").select("id,data,valor_dia,valor_abastecimento,valor_pnr,valor_perdidos,cidade,romaneio").eq("user_id", uid),
    supabase.from("recebimentos").select("id,data_recebimento,data_pagamento,valor_recebido,nome_periodo,status").eq("user_id", uid),
    supabase.from("pix_recebidos").select("id,data,valor,pagador,descricao").eq("user_id", uid),
    supabase.from("pix_enviados").select("id,data,valor,destinatario,descricao").eq("user_id", uid),
    supabase.from("abastecimentos").select("id,data,valor_total,posto,litros").eq("user_id", uid),
    supabase.from("manutencoes").select("id,data,tipo,valor").eq("user_id", uid),
    supabase.from("contas_fixas").select("id,nome,valor,categoria,pago,mes_referencia,dia_vencimento").eq("user_id", uid).eq("pago", true),
    supabase.from("cartao_lancamentos").select("id,data_compra,valor_total,descricao,categoria,parcelas").eq("user_id", uid),
    supabase.from("fluxo_caixa").select("id,data,tipo,categoria,descricao,valor").eq("user_id", uid),
  ]);

  const rows: UnifiedRow[] = [];

  // Entregas (lancamentos)
  for (const l of lanc.data ?? []) {
    const data = l.data as string;
    if (!inRange(data, opt)) continue;
    if (l.valor_dia && Number(l.valor_dia) > 0) {
      rows.push({
        id: `lanc-${l.id}`,
        data,
        tipo: "entrada",
        categoria: "Entregas",
        descricao: [l.cidade, l.romaneio].filter(Boolean).join(" • ") || "Diária de entregas",
        valor: Number(l.valor_dia),
        origem: "lancamento",
      });
    }
    if (l.valor_abastecimento && Number(l.valor_abastecimento) > 0) {
      rows.push({
        id: `lanc-abast-${l.id}`,
        data,
        tipo: "saida",
        categoria: "Combustível",
        descricao: "Abastecimento do dia",
        valor: Number(l.valor_abastecimento),
        origem: "abastecimento",
      });
    }
    if (l.valor_pnr && Number(l.valor_pnr) > 0) {
      rows.push({
        id: `lanc-pnr-${l.id}`,
        data,
        tipo: "saida",
        categoria: "PNR",
        descricao: "Desconto PNR",
        valor: Number(l.valor_pnr),
        origem: "pnr",
      });
    }
    if (l.valor_perdidos && Number(l.valor_perdidos) > 0) {
      rows.push({
        id: `lanc-perd-${l.id}`,
        data,
        tipo: "saida",
        categoria: "Pacotes perdidos",
        descricao: "Desconto por pacotes perdidos",
        valor: Number(l.valor_perdidos),
        origem: "perdidos",
      });
    }
  }

  // Recebimentos (quinzenais/mensais) — só os efetivamente recebidos
  for (const r of rec.data ?? []) {
    if (r.status !== "recebido" || !r.valor_recebido) continue;
    const data = (r.data_recebimento || r.data_pagamento) as string;
    if (!inRange(data, opt)) continue;
    rows.push({
      id: `rec-${r.id}`,
      data,
      tipo: "entrada",
      categoria: "Recebimento",
      descricao: r.nome_periodo || "Recebimento",
      valor: Number(r.valor_recebido),
      origem: "recebimento",
    });
  }

  // PIX recebidos
  for (const p of pixR.data ?? []) {
    if (!inRange(p.data as string, opt)) continue;
    rows.push({
      id: `pixr-${p.id}`,
      data: p.data as string,
      tipo: "entrada",
      categoria: "PIX recebido",
      descricao: [p.pagador, p.descricao].filter(Boolean).join(" • ") || "PIX recebido",
      valor: Number(p.valor),
      origem: "pix_recebido",
    });
  }

  // PIX enviados
  for (const p of pixE.data ?? []) {
    if (!inRange(p.data as string, opt)) continue;
    rows.push({
      id: `pixe-${p.id}`,
      data: p.data as string,
      tipo: "saida",
      categoria: "PIX enviado",
      descricao: [p.destinatario, p.descricao].filter(Boolean).join(" • ") || "PIX enviado",
      valor: Number(p.valor),
      origem: "pix_enviado",
    });
  }

  // Abastecimentos avulsos (fora de lançamentos)
  for (const a of abast.data ?? []) {
    if (!inRange(a.data as string, opt)) continue;
    rows.push({
      id: `abast-${a.id}`,
      data: a.data as string,
      tipo: "saida",
      categoria: "Combustível",
      descricao: a.posto ? `Posto ${a.posto}` : `${a.litros} L`,
      valor: Number(a.valor_total),
      origem: "abastecimento",
    });
  }

  // Manutenções
  for (const m of man.data ?? []) {
    if (!inRange(m.data as string, opt)) continue;
    rows.push({
      id: `man-${m.id}`,
      data: m.data as string,
      tipo: "saida",
      categoria: "Manutenção",
      descricao: String(m.tipo),
      valor: Number(m.valor),
      origem: "manutencao",
    });
  }

  // Contas fixas (apenas as marcadas como pagas)
  for (const c of contas.data ?? []) {
    // mes_referencia esperado no formato YYYY-MM
    const mes = (c.mes_referencia as string) || new Date().toISOString().slice(0, 7);
    const dia = String(c.dia_vencimento ?? 1).padStart(2, "0");
    const data = `${mes}-${dia}`;
    if (!inRange(data, opt)) continue;
    rows.push({
      id: `conta-${c.id}-${mes}`,
      data,
      tipo: "saida",
      categoria: c.categoria || "Conta fixa",
      descricao: c.nome,
      valor: Number(c.valor),
      origem: "conta_fixa",
    });
  }

  // Cartão de crédito — lançamentos contabilizados na data da compra
  for (const c of cart.data ?? []) {
    if (!inRange(c.data_compra as string, opt)) continue;
    rows.push({
      id: `cart-${c.id}`,
      data: c.data_compra as string,
      tipo: "saida",
      categoria: c.categoria || "Cartão de crédito",
      descricao: `${c.descricao}${c.parcelas && c.parcelas > 1 ? ` (${c.parcelas}x)` : ""}`,
      valor: Number(c.valor_total),
      origem: "cartao",
    });
  }

  // Fluxo de caixa — lançamentos manuais "outros gastos/entradas"
  for (const f of fluxo.data ?? []) {
    if (!inRange(f.data as string, opt)) continue;
    rows.push({
      id: `flx-${f.id}`,
      data: f.data as string,
      tipo: f.tipo as "entrada" | "saida",
      categoria: f.categoria || "Outros",
      descricao: f.descricao || "",
      valor: Number(f.valor),
      origem: "fluxo_manual",
    });
  }

  rows.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return rows;
}

export function totalizar(rows: UnifiedRow[]) {
  const entradas = rows.filter((r) => r.tipo === "entrada").reduce((s, r) => s + r.valor, 0);
  const saidas = rows.filter((r) => r.tipo === "saida").reduce((s, r) => s + r.valor, 0);
  return { entradas, saidas, saldo: entradas - saidas };
}
