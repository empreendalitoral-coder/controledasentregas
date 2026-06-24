import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useFullStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { BRL, computeResumo, kmRodado } from "@/lib/calc";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/graficos")({
  head: () => ({
    meta: [
      { title: "Gráficos — Entrega Pro" },
      { name: "description", content: "Gráficos de ganhos, combustível, KM e pacotes." },
    ],
  }),
  component: GraficosPage,
});

type Metric = "ganhos" | "liquido" | "real" | "combustivel" | "km" | "pacotes" | "pnr";

const METRICS: { id: Metric; label: string; color: string }[] = [
  { id: "ganhos", label: "Bruto", color: "oklch(0.85 0.17 90)" },
  { id: "liquido", label: "Líquido", color: "oklch(0.75 0.18 145)" },
  { id: "real", label: "Lucro Real", color: "oklch(0.7 0.18 165)" },
  { id: "combustivel", label: "Combustível", color: "oklch(0.65 0.22 22)" },
  { id: "km", label: "KM", color: "oklch(0.65 0.15 250)" },
  { id: "pacotes", label: "Pacotes", color: "oklch(0.7 0.15 300)" },
  { id: "pnr", label: "PNR", color: "oklch(0.8 0.16 70)" },
];

const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function GraficosPage() {
  const state = useFullStore();
  const [metric, setMetric] = useState<Metric>("ganhos");
  const conf = METRICS.find((m) => m.id === metric)!;
  const now = new Date();

  const data = useMemo(() => {
    const arr: { mes: string; valor: number; ano: number; m: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const r = computeResumo(state, { inicio, fim });
      let valor = 0;
      switch (metric) {
        case "ganhos": valor = r.valor_bruto; break;
        case "liquido": valor = r.lucro_liquido; break;
        case "real": valor = r.lucro_real; break;
        case "combustivel": valor = r.combustivel; break;
        case "km": valor = r.km; break;
        case "pacotes": valor = r.pacotes; break;
        case "pnr": valor = r.pnr; break;
      }
      arr.push({ mes: MESES_CURTO[d.getMonth()], valor, ano: d.getFullYear(), m: d.getMonth() });
    }
    return arr;
  }, [state, metric, now]);

  const isMoney = ["ganhos", "liquido", "real", "combustivel"].includes(metric);
  const fmt = (v: number) => (isMoney ? BRL(v) : v.toLocaleString("pt-BR"));

  // Lucro real breakdown for current month
  const cur = computeResumo(
    state,
    {
      inicio: new Date(now.getFullYear(), now.getMonth(), 1),
      fim: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    },
  );

  return (
    <AppShell title="Gráficos">
      <div className="ep-card">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={`shrink-0 px-3 h-9 rounded-full text-xs font-medium border transition ${
                metric === m.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-input/30 text-muted-foreground border-border"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground mb-2 mt-1">
          {conf.label} — últimos 6 meses
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.025 255)" />
              <XAxis dataKey="mes" stroke="oklch(0.7 0.02 255)" fontSize={11} />
              <YAxis stroke="oklch(0.7 0.02 255)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.23 0.025 255)",
                  border: "1px solid oklch(0.32 0.025 255)",
                  borderRadius: 8,
                  color: "white",
                }}
                formatter={(v: number) => fmt(v)}
              />
              <Bar dataKey="valor" fill={conf.color} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ep-card mt-4">
        <h3 className="font-semibold mb-3">Lucro real — mês atual</h3>
        <Row label="Valor bruto" v={BRL(cur.valor_bruto)} pos />
        <Row label="(-) PNR + perdidos" v={BRL(cur.descontos)} neg />
        <Row label="(-) Combustível" v={BRL(cur.combustivel)} neg />
        <Row label="(-) Manutenções" v={BRL(cur.manutencoes)} neg />
        <div className="border-t border-border my-2" />
        <Row label="Lucro líquido" v={BRL(cur.lucro_liquido)} pos big />
        <Row label="Lucro real" v={BRL(cur.lucro_real)} pos big />
      </div>
    </AppShell>
  );
}

function Row({ label, v, pos, neg, big }: { label: string; v: string; pos?: boolean; neg?: boolean; big?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${pos ? "ep-money-pos" : neg ? "ep-money-neg" : ""} ${big ? "text-lg font-bold" : "font-medium"}`}>
        {v}
      </span>
    </div>
  );
}
// keep import used
void kmRodado;
