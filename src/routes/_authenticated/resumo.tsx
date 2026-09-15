import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useFullStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { BRL, NUM, computeResumo, formatHoras } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CalendarDays, PackageCheck, Route as RouteIcon, Timer, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/resumo")({
  head: () => ({
    meta: [
      { title: "Resumo Mensal — Entrega Pro" },
      { name: "description", content: "Resumo mensal completo do motorista, com médias diárias e lucro real." },
      { property: "og:title", content: "Resumo Mensal — Entrega Pro" },
      { property: "og:description", content: "Resumo mensal completo do motorista, com médias diárias e lucro real." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/resumo" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/resumo" }],
  }),
  component: ResumoPage,
});

function ResumoPage() {
  const state = useFullStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const periodo = useMemo(
    () => ({
      inicio: new Date(year, month, 1),
      fim: new Date(year, month + 1, 0, 23, 59, 59),
    }),
    [year, month],
  );

  const r = computeResumo(state, periodo);
  const dias = r.dias_trabalhados || 1;
  const litrosMes = state.abastecimentos
    .filter((a) => {
      const d = new Date(a.data + "T00:00:00");
      return d >= periodo.inicio && d <= periodo.fim;
    })
    .reduce((s, a) => s + (a.litros ?? 0), 0);

  const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  function prev() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else setMonth(month - 1);
  }
  function next() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(month + 1);
  }

  return (
    <AppShell title="Resumo Mensal" back="/">
      <div className="ep-page-intro mb-4"><div className="ep-icon-chip shrink-0"><TrendingUp className="size-5" /></div><div><h2 className="font-display font-semibold">Visão completa do mês</h2><p className="mt-0.5 text-sm text-muted-foreground">Resultados, custos e médias reunidos em um só lugar.</p></div></div>
      <div className="ep-card flex items-center justify-between gap-2">
        <Button onClick={prev} variant="ghost" size="icon" aria-label="Mês anterior"><ArrowLeft /></Button>
        <div className="flex min-w-0 items-center gap-2 font-semibold">
          <CalendarDays className="size-4 shrink-0 text-primary" />
          {MESES[month]} / {year}
        </div>
        <Button onClick={next} variant="ghost" size="icon" aria-label="Próximo mês"><ArrowRight /></Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric icon={PackageCheck} label="Pacotes" value={NUM(r.pacotes)} />
        <Metric icon={RouteIcon} label="Distância" value={`${NUM(r.km)} km`} />
        <Metric icon={Timer} label="Horas" value={formatHoras(r.horas)} />
        <Metric icon={TrendingUp} label="Lucro real" value={BRL(r.lucro_real)} positive />
      </div>

      <section className="ep-card mt-4 space-y-2">
        <h3 className="font-display font-semibold mb-3">Detalhes do período</h3>
        <Row label="Dias trabalhados" value={NUM(r.dias_trabalhados)} />
        <Row label="Dias de folga" value={NUM(r.dias_folga)} />
        <Row label="Horas trabalhadas" value={formatHoras(r.horas)} />
        <div className="border-t border-border my-2" />
        <Row label="Pacotes entregues" value={NUM(r.pacotes)} />
        <Row label="Insucessos" value={NUM(r.insucessos)} />
        <Row label="PNR" value={NUM(r.pnr)} />
        <Row label="Pacotes perdidos" value={NUM(r.pacotes_perdidos)} />
        <Row label="KM rodados" value={`${NUM(r.km)} km`} />
        <Row label="Combustível gasto" value={BRL(r.combustivel)} />
        <Row label="Manutenções" value={BRL(r.manutencoes)} />
        <div className="border-t border-border my-2" />
        <Row label="Valor bruto" value={BRL(r.valor_bruto)} valueClass="ep-money-pos" />
        <Row label="Total de descontos" value={`- ${BRL(r.descontos)}`} valueClass="ep-money-neg" />
        <Row label="Valor líquido" value={BRL(r.lucro_liquido)} valueClass="ep-money-pos" big />
        <Row label="Lucro real" value={BRL(r.lucro_real)} valueClass="ep-money-pos" big />
      </section>

      <div className="ep-card mt-4">
        <h3 className="font-semibold mb-2">Médias do mês</h3>
        <div className="grid grid-cols-2 gap-2">
          <Tile label="Pacotes por dia" v={(r.pacotes / dias).toFixed(1)} />
          <Tile label="KM por dia" v={`${(r.km / dias).toFixed(1)} km`} />
          <Tile
            label="Consumo médio"
            v={litrosMes > 0 ? `${(r.km / litrosMes).toFixed(2)} km/l` : "—"}
          />
          <Tile label="Ganho por dia" v={BRL(r.lucro_liquido / dias)} />
        </div>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  valueClass = "",
  big = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  big?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${valueClass} ${big ? "text-lg font-bold" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

function Tile({ label, v }: { label: string; v: string }) {
  return (
    <div className="ep-stat-tile">
      <div className="ep-label">{label}</div>
      <div className="ep-value">{v}</div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, positive = false }: { icon: typeof PackageCheck; label: string; value: string; positive?: boolean }) {
  return <div className="ep-stat-tile min-w-0"><div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5 text-primary" />{label}</div><div className={`mt-1 truncate font-display text-base font-bold ${positive ? "ep-money-pos" : ""}`}>{value}</div></div>;
}
