import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, useFullStore } from "@/lib/store";
import { useMemo, useState } from "react";
import {
  BRL,
  NUM,
  computeResumo,
  currentMonthRange,
  inPeriod,
  kmRodado,
  lucroLiquido,
  rangeFromStrings,
  type Periodo,
} from "@/lib/calc";
import { Eye, Pencil, Trash2, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Entrega Pro" },
      { name: "description", content: "Histórico de todos os dias trabalhados, com cidade, entregas e lucro líquido." },
      { property: "og:title", content: "Histórico — Entrega Pro" },
      { property: "og:description", content: "Histórico de todos os dias trabalhados, com cidade, entregas e lucro líquido." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/historico" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/historico" }],
  }),
  component: HistoricoPage,
});

type Filtro = "hoje" | "semana" | "mes" | "custom";

function HistoricoPage() {
  const state = useFullStore();
  const nav = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>("mes");
  const [monthOffset, setMonthOffset] = useState(0);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const periodo: Periodo = useMemo(() => {
    const now = new Date();
    if (filtro === "hoje") {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { inicio: d, fim: new Date(d.getTime() + 86399999) };
    }
    if (filtro === "semana") {
      const day = now.getDay();
      const diff = (day + 6) % 7;
      const inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      const fim = new Date(inicio.getTime() + 7 * 86400000 - 1);
      return { inicio, fim };
    }
    if (filtro === "custom" && start && end) {
      return rangeFromStrings(start, end);
    }
    return currentMonthRange(
      new Date(now.getFullYear(), now.getMonth() + monthOffset, 1),
    );
  }, [filtro, start, end, monthOffset]);

  const lancs = useMemo(
    () =>
      [...state.lancamentos]
        .filter((l) => inPeriod(l.data, periodo))
        .sort((a, b) => (a.data > b.data ? 1 : -1)),
    [state.lancamentos, periodo],
  );

  const r = computeResumo(state, periodo);

  function fmtD(s: string) {
    const d = new Date(s + "T00:00:00");
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function removeSelected() {
    if (!selected) return;
    if (!confirm("Excluir este lançamento?")) return;
    actions.deleteLancamento(selected);
    setSelected(null);
    toast.success("Excluído");
  }

  const filtros: { id: Filtro; label: string }[] = [
    { id: "hoje", label: "Hoje" },
    { id: "semana", label: "Semana" },
    { id: "mes", label: "Mês" },
    { id: "custom", label: "Personalizado" },
  ];

  return (
    <AppShell
      title="Histórico"
      right={
        <button aria-label="Filtros" className="text-foreground/80">
          <Filter className="size-5" />
        </button>
      }
    >
      <div className="ep-card">
        <div className="grid grid-cols-4 gap-1.5 bg-secondary/40 rounded-md p-1">
          {filtros.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFiltro(f.id);
                setMonthOffset(0);
              }}
              className={`h-9 text-xs rounded font-medium transition ${
                filtro === f.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {filtro === "custom" ? (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-10 rounded-md bg-input/60 border border-border px-2 text-sm"
            />
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-10 rounded-md bg-input/60 border border-border px-2 text-sm"
            />
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => filtro === "mes" && setMonthOffset(monthOffset - 1)}
              className="size-8 grid place-items-center text-primary disabled:opacity-30"
              disabled={filtro !== "mes"}
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="text-xs text-muted-foreground">
              {periodo.inicio.toLocaleDateString("pt-BR")} a{" "}
              {periodo.fim.toLocaleDateString("pt-BR")}
            </div>
            <button
              onClick={() => filtro === "mes" && setMonthOffset(monthOffset + 1)}
              className="size-8 grid place-items-center text-primary disabled:opacity-30"
              disabled={filtro !== "mes"}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {lancs.length === 0 ? (
          <div className="ep-card py-10 text-center text-muted-foreground text-sm">
            Sem lançamentos no período.
          </div>
        ) : (
          lancs.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelected(selected === l.id ? null : l.id)}
              className={`w-full text-left ep-card !p-3 transition ${
                selected === l.id
                  ? "border-primary bg-primary/10"
                  : "hover:bg-secondary/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{fmtD(l.data)}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {l.trabalhou ? l.cidade ?? "—" : "Folga"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="ep-money-pos text-base">{BRL(lucroLiquido(l))}</div>
                  <div className="text-[10px] text-muted-foreground">Líquido</div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span>Pacotes: {NUM(l.pacotes ?? 0)}</span>
                <span>PNR: {NUM(l.pnr ?? 0)}</span>
                <span>Perdidos: {NUM(l.pacotes_perdidos ?? 0)}</span>
                <span>KM: {NUM(kmRodado(l))}</span>
              </div>
            </button>
          ))
        )}

        {lancs.length > 0 && (
          <div className="ep-card !p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Totalização
              </span>
              <span className="ep-money-pos text-base">{BRL(r.lucro_liquido)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>Pacotes: {NUM(r.pacotes)}</span>
              <span>PNR: {NUM(r.pnr)}</span>
              <span>Perdidos: {NUM(r.pacotes_perdidos)}</span>
              <span>KM: {NUM(r.km)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action card (Visualizar / Editar / Excluir) */}
      <div className="ep-card mt-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <ActionBtn
            icon={<Eye className="size-5" />}
            label="Visualizar"
            disabled={!selected}
            onClick={() => selected && nav({ to: "/lancamento/$id", params: { id: selected } })}
          />
          <ActionBtn
            icon={<Pencil className="size-5" />}
            label="Editar"
            disabled={!selected}
            tone="primary"
            onClick={() => selected && nav({ to: "/lancamento/$id", params: { id: selected } })}
          />
          <ActionBtn
            icon={<Trash2 className="size-5" />}
            label="Excluir"
            disabled={!selected}
            tone="destructive"
            onClick={removeSelected}
          />
        </div>
        {!selected && (
          <div className="text-center text-[11px] text-muted-foreground mt-2">
            Toque em uma linha para selecionar
          </div>
        )}
      </div>

      <Link
        to="/lancamento/$id"
        params={{ id: "novo" }}
        className="fixed bottom-20 right-4 size-14 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-xl shadow-primary/30 font-bold text-2xl active:scale-95 transition z-30"
        aria-label="Novo lançamento"
      >
        +
      </Link>
    </AppShell>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "destructive";
}) {
  const color =
    tone === "destructive"
      ? "text-destructive"
      : tone === "primary"
        ? "text-primary"
        : "text-foreground/85";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 py-2 rounded-md transition ${color} ${
        disabled ? "opacity-40" : "hover:bg-secondary/40"
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
