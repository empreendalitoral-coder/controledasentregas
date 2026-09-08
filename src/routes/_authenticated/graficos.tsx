import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useFullStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { BRL, computeResumo } from "@/lib/calc";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Percent,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/graficos")({
  head: () => ({
    meta: [
      { title: "Gráficos — Entrega Pro" },
      { name: "description", content: "Dashboard financeiro com faturamento, lucro, despesas e entregas." },
    ],
  }),
  component: GraficosPage,
});

type Tab = "faturamento" | "lucro" | "despesas" | "entregas";

const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const TABS: { id: Tab; label: string }[] = [
  { id: "faturamento", label: "Faturamento" },
  { id: "lucro", label: "Lucro" },
  { id: "despesas", label: "Despesas" },
  { id: "entregas", label: "Entregas" },
];

const TAB_META: Record<Tab, { color: string; isMoney: boolean; suffix?: string }> = {
  faturamento: { color: "#facc15", isMoney: true },
  lucro: { color: "#22c55e", isMoney: true },
  despesas: { color: "#ef4444", isMoney: true },
  entregas: { color: "#8b5cf6", isMoney: false, suffix: " pct" },
};

function GraficosPage() {
  const state = useFullStore();
  const [tab, setTab] = useState<Tab>("faturamento");
  const now = new Date();

  const series = useMemo(() => {
    const arr: { mes: string; valor: number; ano: number; m: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const r = computeResumo(state, { inicio, fim });
      let valor = 0;
      switch (tab) {
        case "faturamento": valor = r.valor_bruto; break;
        case "lucro": valor = r.lucro_real; break;
        case "despesas": valor = r.combustivel + r.manutencoes + r.descontos; break;
        case "entregas": valor = r.pacotes; break;
      }
      arr.push({ mes: MESES_CURTO[d.getMonth()], valor, ano: d.getFullYear(), m: d.getMonth() });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, tab]);

  // Previous 6 months for comparison
  const prevTotal = useMemo(() => {
    let total = 0;
    for (let i = 11; i >= 6; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const r = computeResumo(state, { inicio, fim });
      switch (tab) {
        case "faturamento": total += r.valor_bruto; break;
        case "lucro": total += r.lucro_real; break;
        case "despesas": total += r.combustivel + r.manutencoes + r.descontos; break;
        case "entregas": total += r.pacotes; break;
      }
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, tab]);

  const meta = TAB_META[tab];
  const fmt = (v: number) => (meta.isMoney ? BRL(v) : v.toLocaleString("pt-BR") + (meta.suffix ?? ""));
  const fmtShort = (v: number) => {
    if (!meta.isMoney) return v.toLocaleString("pt-BR");
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return String(v);
  };

  const total = series.reduce((s, x) => s + x.valor, 0);
  const maior = series.reduce((a, b) => (b.valor > a.valor ? b : a), series[0] ?? { mes: "—", valor: 0, ano: 0, m: 0 });
  const media = total / (series.length || 1);
  const mesAtual = series[series.length - 1] ?? { mes: "—", valor: 0 };
  const mesAnterior = series[series.length - 2] ?? { mes: "—", valor: 0 };
  const variacaoMes = mesAnterior.valor > 0
    ? ((mesAtual.valor - mesAnterior.valor) / mesAnterior.valor) * 100
    : 0;
  const variacaoPeriodo = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

  // Donut breakdown for current month
  const cur = computeResumo(state, {
    inicio: new Date(now.getFullYear(), now.getMonth(), 1),
    fim: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  });

  const donut = [
    { name: "Lucro líquido", value: Math.max(0, cur.lucro_real), color: "#22c55e" },
    { name: "Combustível", value: cur.combustivel, color: "#facc15" },
    { name: "Manutenção", value: cur.manutencoes, color: "#a855f7" },
    { name: "PNR/Perdas", value: cur.descontos, color: "#ef4444" },
  ];
  const donutTotal = donut.reduce((s, x) => s + x.value, 0);
  const margem = cur.valor_bruto > 0 ? (cur.lucro_real / cur.valor_bruto) * 100 : 0;

  const gradientId = `grad-${tab}`;

  return (
    <AppShell title="Gráficos">
      {/* Tabs */}
      <div className="ep-card !p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-0 px-1 h-10 rounded-lg text-[11px] sm:text-sm font-medium leading-tight whitespace-nowrap transition ${
              tab === t.id
                ? "bg-primary/15 text-primary shadow-inner"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main area chart card */}
      <div
        key={tab}
        className="ep-card mt-4 relative overflow-hidden animate-fade-in"
        style={{
          background:
            "linear-gradient(160deg, color-mix(in oklab, var(--card) 92%, transparent), color-mix(in oklab, var(--card) 98%, transparent))",
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-lg font-bold">{TABS.find((x) => x.id === tab)?.label}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3" /> Últimos 6 meses
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted-foreground">Total no período</div>
            <div className="text-xl font-bold" style={{ color: meta.color }}>{fmt(total)}</div>
            <div className={`text-xs font-semibold flex items-center gap-1 justify-end ${variacaoPeriodo >= 0 ? "text-green-400" : "text-red-400"}`}>
              {variacaoPeriodo >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {variacaoPeriodo >= 0 ? "+" : ""}{variacaoPeriodo.toFixed(1)}%
            </div>
            <div className="text-[10px] text-muted-foreground">vs. 6 meses anteriores</div>
          </div>
        </div>
        <div className="h-56 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 20, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={meta.color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 255)" vertical={false} />
              <XAxis dataKey="mes" stroke="oklch(0.7 0.02 255)" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="oklch(0.6 0.02 255)" fontSize={10} axisLine={false} tickLine={false} width={38} tickFormatter={fmtShort} />
              <Tooltip
                cursor={{ stroke: meta.color, strokeOpacity: 0.3, strokeWidth: 1 }}
                contentStyle={{
                  background: "oklch(0.2 0.02 255 / 0.95)",
                  border: `1px solid ${meta.color}55`,
                  borderRadius: 10,
                  color: "white",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(v: number) => [fmt(v), TABS.find((x) => x.id === tab)?.label]}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke={meta.color}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={{ r: 4, fill: meta.color, stroke: "oklch(0.15 0.02 255)", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: meta.color, stroke: "white", strokeWidth: 2 }}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <StatTile
            icon={<TrendingUp className="size-4" />}
            iconColor="#facc15"
            label="Maior valor"
            sub={maior.mes}
            value={fmt(maior.valor)}
          />
          <StatTile
            icon={<BarChart3 className="size-4" />}
            iconColor="#22c55e"
            label="Média mensal"
            value={fmt(media)}
          />
          <StatTile
            icon={<Calendar className="size-4" />}
            iconColor="#8b5cf6"
            label="Mês atual"
            sub={mesAtual.mes}
            value={fmt(mesAtual.valor)}
          />
          <StatTile
            icon={<Percent className="size-4" />}
            iconColor={variacaoMes >= 0 ? "#22c55e" : "#ef4444"}
            label="Variação"
            sub={`vs. ${mesAnterior.mes}`}
            value={`${variacaoMes >= 0 ? "+" : ""}${variacaoMes.toFixed(1)}%`}
            valueColor={variacaoMes >= 0 ? "#22c55e" : "#ef4444"}
          />
        </div>
      </div>

      {/* Donut breakdown */}
      <div className="ep-card mt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-base font-bold">Composição do mês</div>
            <div className="text-xs text-muted-foreground">{MESES_LONGO[now.getMonth()]} / {now.getFullYear()}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-[140px] h-[140px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutTotal > 0 ? donut : [{ name: "—", value: 1, color: "#334155" }]}
                  dataKey="value"
                  innerRadius={44}
                  outerRadius={64}
                  paddingAngle={donutTotal > 0 ? 2 : 0}
                  stroke="none"
                  animationDuration={900}
                >
                  {(donutTotal > 0 ? donut : [{ name: "—", value: 1, color: "#334155" }]).map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
              <div>
                <div className="text-[13px] font-bold leading-tight">{BRL(cur.lucro_real)}</div>
                <div className="text-[9px] text-muted-foreground leading-tight">Lucro líquido<br/>mês atual</div>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-1.5 text-xs min-w-0">
            <LegendRow color="#22c55e" label="Valor bruto" value={BRL(cur.valor_bruto)} valueColor="#22c55e" />
            <LegendRow color="#ef4444" label="(-) Despesas" value={BRL(cur.descontos)} valueColor="#ef4444" />
            <LegendRow color="#facc15" label="(-) Combustível" value={BRL(cur.combustivel)} valueColor="#facc15" />
            <LegendRow color="#a855f7" label="(-) Manutenções" value={BRL(cur.manutencoes)} valueColor="#a855f7" />
          </div>
        </div>
      </div>

      {/* Lucro real card */}
      <div
        className="ep-card mt-4 relative overflow-hidden border-green-500/30"
        style={{
          background:
            "linear-gradient(135deg, rgba(34,197,94,0.10), rgba(34,197,94,0.02) 60%, var(--card))",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="size-4 text-green-400" /> Lucro real
            </div>
            <div className="text-2xl font-extrabold text-green-400 mt-1 truncate">{BRL(cur.lucro_real)}</div>
            <div className="text-xs text-muted-foreground mt-2">Margem de lucro</div>
            <div className="text-lg font-bold text-green-400">{margem.toFixed(1)}%</div>
          </div>
          <div className="w-24 h-16 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={900}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatTile({
  icon,
  iconColor,
  label,
  sub,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  sub?: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-input/20 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span style={{ color: iconColor }}>{icon}</span>
        {label}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      <div className="text-sm font-bold mt-1 truncate" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>
    </div>
  );
}

function LegendRow({ color, label, value, valueColor }: { color: string; label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="size-2.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-muted-foreground text-[11px] sm:text-xs leading-tight">{label}</span>
      </div>
      <span
        className="font-semibold shrink-0 whitespace-nowrap text-[11px] sm:text-xs"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
