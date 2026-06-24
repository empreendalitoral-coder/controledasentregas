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
      { name: "description", content: "Histórico de lançamentos por período." },
    ],
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

      <div className="ep-card mt-4 overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <Th>Data</Th>
              <Th>Cidade</Th>
              <Th right>Pac.</Th>
              <Th right>PNR</Th>
              <Th right>Perd.</Th>
              <Th right>KM</Th>
              <Th right>Líquido</Th>
            </tr>
          </thead>
          <tbody>
            {lancs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-muted-foreground">
                  Sem lançamentos no período.
                </td>
              </tr>
            ) : (
              lancs.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setSelected(selected === l.id ? null : l.id)}
                  className={`cursor-pointer border-b border-border/50 last:border-0 transition ${
                    selected === l.id ? "bg-primary/15" : "hover:bg-secondary/30"
                  }`}
                >
                  <Td>{fmtD(l.data)}</Td>
                  <Td className="text-muted-foreground">
                    {l.trabalhou ? l.cidade ?? "—" : "Folga"}
                  </Td>
                  <Td right>{NUM(l.pacotes ?? 0)}</Td>
                  <Td right>{NUM(l.pnr ?? 0)}</Td>
                  <Td right>{NUM(l.pacotes_perdidos ?? 0)}</Td>
                  <Td right>{NUM(kmRodado(l))}</Td>
                  <Td right>
                    <span className="ep-money-pos">{BRL(lucroLiquido(l))}</span>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
          {lancs.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border font-semibold">
                <Td>Totalização</Td>
                <Td></Td>
                <Td right>{NUM(r.pacotes)}</Td>
                <Td right>{NUM(r.pnr)}</Td>
                <Td right>{NUM(r.pacotes_perdidos)}</Td>
                <Td right>{NUM(r.km)}</Td>
                <Td right>
                  <span className="ep-money-pos">{BRL(r.lucro_liquido)}</span>
                </Td>
              </tr>
            </tfoot>
          )}
        </table>
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

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`py-2 px-1.5 font-medium text-[11px] uppercase tracking-wide ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  className = "",
}: {
  children?: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <td className={`py-2 px-1.5 ${right ? "text-right" : "text-left"} ${className}`}>
      {children}
    </td>
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
