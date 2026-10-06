import { describe, expect, it } from "vitest";
import {
  computeResumo,
  descontoTotal,
  horasTrabalhadas,
  inPeriod,
  kmRodado,
  lucroRealDia,
  rangeFromStrings,
} from "./calc";
import type { Lancamento, State } from "./store";

const lancamentoBase: Lancamento = {
  id: "lancamento-1",
  data: "2026-10-05",
  trabalhou: true,
};

describe("cálculos de lançamentos", () => {
  it("calcula quilômetros sem permitir resultado negativo", () => {
    expect(kmRodado({ ...lancamentoBase, km_inicial: 100, km_final: 145.5 })).toBe(45.5);
    expect(kmRodado({ ...lancamentoBase, km_inicial: 200, km_final: 190 })).toBe(0);
  });

  it("calcula horas no mesmo dia e ao atravessar a meia-noite", () => {
    expect(horasTrabalhadas({ ...lancamentoBase, hora_inicio: "08:30", hora_fim: "17:00" })).toBe(8.5);
    expect(horasTrabalhadas({ ...lancamentoBase, hora_inicio: "22:00", hora_fim: "02:00" })).toBe(4);
  });

  it("desconta perdas e combustível do lucro real", () => {
    const lancamento = {
      ...lancamentoBase,
      valor_dia: 300,
      valor_pnr: 15,
      valor_perdidos: 25,
      valor_abastecimento: 50,
    };
    expect(descontoTotal(lancamento)).toBe(40);
    expect(lucroRealDia(lancamento)).toBe(210);
  });
});

describe("períodos e totais", () => {
  it("inclui as datas inicial e final do período", () => {
    const periodo = rangeFromStrings("2026-10-01", "2026-10-31");
    expect(inPeriod("2026-10-01", periodo)).toBe(true);
    expect(inPeriod("2026-10-31", periodo)).toBe(true);
    expect(inPeriod("2026-11-01", periodo)).toBe(false);
  });

  it("soma trabalho, folga, despesas e lucro real", () => {
    const state: State = {
      motorista: { nome: "Motorista" },
      meta_mensal: 5000,
      hydrated: true,
      lancamentos: [
        {
          ...lancamentoBase,
          hora_inicio: "08:00",
          hora_fim: "12:00",
          pacotes: 40,
          insucessos: 2,
          pnr: 1,
          pacotes_perdidos: 1,
          km_inicial: 100,
          km_final: 160,
          valor_dia: 300,
          valor_pnr: 10,
          valor_perdidos: 20,
        },
        { ...lancamentoBase, id: "lancamento-2", data: "2026-10-06", trabalhou: false },
      ],
      abastecimentos: [
        { id: "abastecimento-1", data: "2026-10-05", litros: 10, valor_total: 60 },
      ],
      manutencoes: [
        { id: "manutencao-1", data: "2026-10-05", tipo: "Pneus", valor: 40 },
      ],
      recebimentos: [],
    };

    expect(computeResumo(state, rangeFromStrings("2026-10-01", "2026-10-31"))).toEqual({
      dias_trabalhados: 1,
      dias_folga: 1,
      horas: 4,
      pacotes: 40,
      insucessos: 2,
      pnr: 1,
      pacotes_perdidos: 1,
      km: 60,
      combustivel: 60,
      valor_bruto: 300,
      descontos: 30,
      lucro_liquido: 270,
      manutencoes: 40,
      lucro_real: 170,
    });
  });
});