import type { Lancamento, State } from "./store";

export const BRL = (v: number) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const NUM = (v: number, digits = 0) =>
  (v ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export function kmRodado(l: Lancamento): number {
  if (l.km_inicial != null && l.km_final != null) {
    return Math.max(0, l.km_final - l.km_inicial);
  }
  return 0;
}

export function horasTrabalhadas(l: Lancamento): number {
  if (!l.hora_inicio || !l.hora_fim) return 0;
  const [hi, mi] = l.hora_inicio.split(":").map(Number);
  const [hf, mf] = l.hora_fim.split(":").map(Number);
  let mins = hf * 60 + mf - (hi * 60 + mi);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export function formatHoras(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${hh}h ${mm.toString().padStart(2, "0")}m`;
}

export function descontoTotal(l: Lancamento): number {
  return (l.valor_pnr ?? 0) + (l.valor_perdidos ?? 0);
}

export function lucroLiquido(l: Lancamento): number {
  return (l.valor_dia ?? 0) - descontoTotal(l);
}

export function combustivelDia(l: Lancamento): number {
  return l.valor_abastecimento ?? 0;
}

export function lucroRealDia(l: Lancamento): number {
  return lucroLiquido(l) - combustivelDia(l);
}

export type Periodo = { inicio: Date; fim: Date };

export function inPeriod(dateStr: string, p: Periodo): boolean {
  const d = new Date(dateStr + "T00:00:00");
  return d >= p.inicio && d <= p.fim;
}

export function currentMonthRange(d = new Date()): Periodo {
  const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
  const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  return { inicio, fim };
}

export function rangeFromStrings(start: string, end: string): Periodo {
  return {
    inicio: new Date(start + "T00:00:00"),
    fim: new Date(end + "T23:59:59"),
  };
}

export type Resumo = {
  dias_trabalhados: number;
  dias_folga: number;
  horas: number;
  pacotes: number;
  insucessos: number;
  pnr: number;
  pacotes_perdidos: number;
  km: number;
  combustivel: number;
  valor_bruto: number;
  descontos: number;
  lucro_liquido: number;
  manutencoes: number;
  lucro_real: number;
};

export function computeResumo(state: State, periodo: Periodo): Resumo {
  const ls = state.lancamentos.filter((l) => inPeriod(l.data, periodo));
  const abs = state.abastecimentos.filter((a) => inPeriod(a.data, periodo));
  const mans = state.manutencoes.filter((m) => inPeriod(m.data, periodo));

  let dt = 0,
    df = 0,
    horas = 0,
    pacotes = 0,
    insucessos = 0,
    pnr = 0,
    perdidos = 0,
    km = 0,
    bruto = 0,
    descontos = 0;

  for (const l of ls) {
    if (l.trabalhou) {
      dt++;
      horas += horasTrabalhadas(l);
      pacotes += l.pacotes ?? 0;
      insucessos += l.insucessos ?? 0;
      pnr += l.pnr ?? 0;
      perdidos += l.pacotes_perdidos ?? 0;
      km += kmRodado(l);
      bruto += l.valor_dia ?? 0;
      descontos += descontoTotal(l);
    } else {
      df++;
    }
  }

  const combustivel = abs.reduce((s, a) => s + (a.valor_total ?? 0), 0);
  const manutencoes = mans.reduce((s, m) => s + (m.valor ?? 0), 0);
  const lucro_liquido = bruto - descontos;
  const lucro_real = lucro_liquido - combustivel - manutencoes;

  return {
    dias_trabalhados: dt,
    dias_folga: df,
    horas,
    pacotes,
    insucessos,
    pnr,
    pacotes_perdidos: perdidos,
    km,
    combustivel,
    valor_bruto: bruto,
    descontos,
    lucro_liquido,
    manutencoes,
    lucro_real,
  };
}

export function previstoRecebimento(state: State, p: Periodo) {
  const r = computeResumo(state, p);
  // Previsto líquido considera bruto - descontos - combustível do período
  const previsto = r.valor_bruto - r.descontos - r.combustivel;
  return { ...r, previsto };
}
