import { BRL, NUM, fmtTaxa, taxaEntrega, type Resumo } from "@/lib/calc";

export function monthlyShareMetrics(resumo: Resumo) {
  return {
    entregas: NUM(Math.max(0, resumo.pacotes - Math.min(Math.max(resumo.insucessos, 0), resumo.pacotes))),
    taxa: fmtTaxa(taxaEntrega(resumo.pacotes, resumo.insucessos)),
    lucro: BRL(resumo.lucro_real),
    dias: NUM(resumo.dias_trabalhados),
    km: `${NUM(resumo.km)} km`,
  };
}

export function monthlyShareCaption(period: string, link: string) {
  return `Meu mês na estrada • ${period}\nAcompanhe suas entregas com o Entrega Pro.\n${link}`;
}