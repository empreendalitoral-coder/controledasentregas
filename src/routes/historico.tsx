import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useFullStore } from "@/lib/store";
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
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { actions } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Entrega Pro" },
      { name: "description", content: "Histórico de lançamentos por período." },
    ],
  }),
  component: HistoricoPage,
});

type Filtro = "hoje" | "semana" | "mes" | "custom";

function HistoricoPage() {
  const state = useFullStore();
  const [filtro, setFiltro] = useState<Filtro>("mes");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const periodo: Periodo = useMemo(() => {
    const now = new Date();
    if (filtro === "hoje") {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { inicio: d, fim: new Date(d.getTime() + 86399999) };
    }
    if (filtro === "semana") {
      const day = now.getDay();
      const diff = (day + 6) % 7; // segunda como início
      const inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      const fim = new Date(inicio.getTime() + 7 * 86400000 - 1);
      return { inicio, fim };
    }
    if (filtro === "custom" && start && end) {
      return rangeFromStrings(start, end);
    }
    return currentMonthRange(now);
  }, [filtro, start, end]);

  const lancs = useMemo(
    () =>
      [...state.lancamentos]
        .filter((l) => inPeriod(l.data, periodo))
        .sort((a, b) => (a.data > b.data ? -1 : 1)),
    [state.lancamentos, periodo],
  );

  const r = computeResumo(state, periodo);

  function fmtD(s: string) {
    const d = new Date(s + "T00:00:00");
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function remove(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    actions.deleteLancamento(id);
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
        <Link
          to="/lancamento/$id"
          params={{ id: "novo" }}
          className="text-primary"
          aria-label="Novo lançamento"
        >
          <Plus className="size-5" />
        </Link>
      }
    >
      <div className="ep-card">
        <div className="grid grid-cols-4 gap-1.5 bg-secondary/40 rounded-md p-1">
          {filtros.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
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
        {filtro === "custom" && (
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
        )}
        <div className="mt-3 text-center text-xs text-muted-foreground">
          {periodo.inicio.toLocaleDateString("pt-BR")} a{" "}
          {periodo.fim.toLocaleDateString("pt-BR")}
        </div>
      </div>

      <div className="ep-card mt-4 overflow-hidden">
        <div className="text-xs grid grid-cols-[1fr_0.7fr_0.6fr_0.5fr_0.7fr_1fr] gap-1 text-muted-foreground pb-2 border-b border-border">
          <span>Data</span>
          <span>Cidade</span>
          <span className="text-right">Pac.</span>
          <span className="text-right">PNR</span>
          <span className="text-right">KM</span>
          <span className="text-right">Líquido</span>
        </div>
        {lancs.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Sem lançamentos no período.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {lancs.map((l) => (
              <li key={l.id} className="py-2.5">
                <div className="text-sm grid grid-cols-[1fr_0.7fr_0.6fr_0.5fr_0.7fr_1fr] gap-1 items-center">
                  <span className="font-medium">{fmtD(l.data)}</span>
                  <span className="truncate text-muted-foreground">
                    {l.trabalhou ? l.cidade ?? "—" : "Folga"}
                  </span>
                  <span className="text-right">{NUM(l.pacotes ?? 0)}</span>
                  <span className="text-right">{NUM(l.pnr ?? 0)}</span>
                  <span className="text-right">{NUM(kmRodado(l))}</span>
                  <span className="text-right ep-money-pos">
                    {BRL(lucroLiquido(l))}
                  </span>
                </div>
                <div className="mt-2 flex gap-2 justify-end">
                  <Link
                    to="/lancamento/$id"
                    params={{ id: l.id }}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-border text-muted-foreground"
                  >
                    <Eye className="size-3" /> Ver
                  </Link>
                  <Link
                    to="/lancamento/$id"
                    params={{ id: l.id }}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-border text-primary"
                  >
                    <Pencil className="size-3" /> Editar
                  </Link>
                  <button
                    onClick={() => remove(l.id)}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-destructive/40 text-destructive"
                  >
                    <Trash2 className="size-3" /> Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 pt-3 border-t border-border text-sm grid grid-cols-[1fr_0.7fr_0.6fr_0.5fr_0.7fr_1fr] gap-1 font-semibold">
          <span>Total</span>
          <span></span>
          <span className="text-right">{NUM(r.pacotes)}</span>
          <span className="text-right">{NUM(r.pnr)}</span>
          <span className="text-right">{NUM(r.km)}</span>
          <span className="text-right ep-money-pos">{BRL(r.lucro_liquido)}</span>
        </div>
      </div>
    </AppShell>
  );
}
