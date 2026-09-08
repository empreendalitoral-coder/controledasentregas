import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useFullStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { BRL, NUM } from "@/lib/calc";
import { FileDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financeiro/quinzena")({
  head: () => ({
    meta: [
      { title: "Fechamento por Período — Entrega Pro" },
      { name: "description", content: "Fechamento por semana, quinzena, mês ou período personalizado, com relatório em PDF." },
      { property: "og:title", content: "Fechamento por Período — Entrega Pro" },
      { property: "og:description", content: "Fechamento por semana, quinzena, mês ou período personalizado, com relatório em PDF." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/financeiro/quinzena" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/financeiro/quinzena" }],
  }),
  component: RelatorioPage,
});

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const diaSemana = (s: string) => DIAS_SEMANA[new Date(s + "T00:00:00").getDay()];
const fmtData = (s: string) => { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
const iso = (d: Date) => d.toISOString().slice(0, 10);

type Modo = "semana" | "quinzena" | "mes" | "ano" | "personalizado";

type Bucket = { titulo: string; inicio: string; fim: string };

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 = domingo
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildBuckets(modo: Modo, ref: Date, custom: { start: string; end: string }): { buckets: Bucket[]; periodoLabel: string } {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  if (modo === "semana") {
    const ini = startOfWeek(ref);
    const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
    return {
      buckets: [{ titulo: `Semana de ${fmtData(iso(ini))} a ${fmtData(iso(fim))}`, inicio: iso(ini), fim: iso(fim) }],
      periodoLabel: `Semana ${fmtData(iso(ini))} — ${fmtData(iso(fim))}`,
    };
  }
  if (modo === "quinzena") {
    const mm = String(m + 1).padStart(2, "0");
    const ultimo = new Date(y, m + 1, 0).getDate();
    return {
      buckets: [
        { titulo: "1ª Quinzena (01 a 15)", inicio: `${y}-${mm}-01`, fim: `${y}-${mm}-15` },
        { titulo: `2ª Quinzena (16 a ${ultimo})`, inicio: `${y}-${mm}-16`, fim: `${y}-${mm}-${String(ultimo).padStart(2, "0")}` },
      ],
      periodoLabel: `${MESES[m]} / ${y}`,
    };
  }
  if (modo === "mes") {
    const mm = String(m + 1).padStart(2, "0");
    const ultimo = new Date(y, m + 1, 0).getDate();
    return {
      buckets: [{ titulo: `${MESES[m]} de ${y}`, inicio: `${y}-${mm}-01`, fim: `${y}-${mm}-${String(ultimo).padStart(2, "0")}` }],
      periodoLabel: `${MESES[m]} / ${y}`,
    };
  }
  if (modo === "ano") {
    const buckets: Bucket[] = [];
    for (let i = 0; i < 12; i++) {
      const mm = String(i + 1).padStart(2, "0");
      const ultimo = new Date(y, i + 1, 0).getDate();
      buckets.push({ titulo: MESES[i], inicio: `${y}-${mm}-01`, fim: `${y}-${mm}-${String(ultimo).padStart(2, "0")}` });
    }
    return { buckets, periodoLabel: `Ano ${y}` };
  }
  // personalizado
  return {
    buckets: [{ titulo: `${fmtData(custom.start)} a ${fmtData(custom.end)}`, inicio: custom.start, fim: custom.end }],
    periodoLabel: `${fmtData(custom.start)} — ${fmtData(custom.end)}`,
  };
}

type LancRow = { id: string; data: string; cidade: string; romaneio: string; pacotes: number; valor: number; observacao: string };

function RelatorioPage() {
  const state = useFullStore();
  const now = new Date();
  const [modo, setModo] = useState<Modo>("quinzena");
  const [ref, setRef] = useState<Date>(now);
  const [custom, setCustom] = useState({ start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now) });
  const [exporting, setExporting] = useState(false);

  const { buckets, periodoLabel } = useMemo(() => buildBuckets(modo, ref, custom), [modo, ref, custom]);

  const dados = useMemo(() => {
    const inicio = buckets[0].inicio;
    const fim = buckets[buckets.length - 1].fim;
    const dentro = (d: string) => d >= inicio && d <= fim;

    const bucketsComRows = buckets.map((b) => {
      const rows: LancRow[] = state.lancamentos
        .filter((l) => l.data >= b.inicio && l.data <= b.fim && l.trabalhou)
        .map((l) => ({
          id: l.id,
          data: l.data,
          cidade: l.cidade || "—",
          romaneio: l.romaneio || "—",
          pacotes: l.pacotes ?? 0,
          valor: l.valor_dia ?? 0,
          observacao: l.observacao || "",
        }))
        .sort((a, b2) => a.data.localeCompare(b2.data));
      const total = rows.reduce((s, r) => s + r.valor, 0);
      return { ...b, rows, total };
    });

    const totalBruto = bucketsComRows.reduce((s, b) => s + b.total, 0);
    const combustivel = state.abastecimentos.filter((a) => dentro(a.data)).reduce((s, a) => s + (a.valor_total ?? 0), 0);
    const outras = state.manutencoes.filter((m) => dentro(m.data)).reduce((s, m) => s + (m.valor ?? 0), 0);
    const lucro = totalBruto - combustivel - outras;

    return { buckets: bucketsComRows, totalBruto, combustivel, outras, lucro };
  }, [buckets, state.lancamentos, state.abastecimentos, state.manutencoes]);

  function shift(dir: -1 | 1) {
    const d = new Date(ref);
    if (modo === "semana") d.setDate(d.getDate() + 7 * dir);
    else if (modo === "quinzena" || modo === "mes") d.setMonth(d.getMonth() + dir);
    else if (modo === "ano") d.setFullYear(d.getFullYear() + dir);
    setRef(d);
  }

  async function exportarPDF() {
    setExporting(true);
    try {
      const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = (autoTableMod as unknown as { default: (doc: unknown, opts: unknown) => void }).default;
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const nome = state.motorista.nome || "Motorista";

      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text("Relatório Financeiro", pageW / 2, 15, { align: "center" });
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Motorista: ${nome}`, 14, 25);
      doc.text(`Período: ${periodoLabel}`, 14, 31);

      const head = [["Data", "Dia", "Cidade", "Romaneio", "Pacotes", "Valor", "Observação"]];
      let cursorY = 38;

      for (const b of dados.buckets) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        doc.text(b.titulo, 14, cursorY); cursorY += 3;
        autoTable(doc, {
          startY: cursorY,
          head,
          body: b.rows.length ? b.rows.map((l) => [fmtData(l.data), diaSemana(l.data), l.cidade, l.romaneio, NUM(l.pacotes), BRL(l.valor), l.observacao]) : [["—", "—", "—", "—", "—", "—", "Sem lançamentos"]],
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [34, 197, 94], textColor: 255 },
          columnStyles: { 6: { cellWidth: 40 } },
        });
        // @ts-expect-error autoTable augments doc
        cursorY = doc.lastAutoTable.finalY + 4;
        doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        doc.text(`Total: ${BRL(b.total)}`, pageW - 14, cursorY, { align: "right" });
        cursorY += 8;
        if (cursorY > 260) { doc.addPage(); cursorY = 15; }
      }

      autoTable(doc, {
        startY: cursorY,
        body: [
          ["Total bruto", BRL(dados.totalBruto)],
          ["Combustível", `- ${BRL(dados.combustivel)}`],
          ["Outras despesas", `- ${BRL(dados.outras)}`],
          ["Lucro líquido", BRL(dados.lucro)],
        ],
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold" } },
      });

      doc.save(`relatorio-${modo}-${iso(ref)}.pdf`);
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar PDF");
    } finally { setExporting(false); }
  }

  return (
    <AppShell title="Relatório Financeiro" back="/financeiro">
      <div className="ep-card">
        <div className="text-xs text-muted-foreground mb-2">Tipo de período</div>
        <div className="grid grid-cols-5 gap-1">
          {(["semana", "quinzena", "mes", "ano", "personalizado"] as Modo[]).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`h-9 rounded-md text-xs font-medium transition ${modo === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {m === "mes" ? "Mês" : m === "personalizado" ? "Custom" : m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {modo !== "personalizado" ? (
          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => shift(-1)} className="p-2 rounded-md hover:bg-muted"><ChevronLeft className="size-5 text-primary" /></button>
            <div className="font-semibold flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-primary" />
              {periodoLabel}
            </div>
            <button onClick={() => shift(1)} className="p-2 rounded-md hover:bg-muted"><ChevronRight className="size-5 text-primary" /></button>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              De
              <input type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} className="mt-1 w-full h-10 rounded-md bg-muted px-2 text-sm" />
            </label>
            <label className="text-xs text-muted-foreground">
              Até
              <input type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} className="mt-1 w-full h-10 rounded-md bg-muted px-2 text-sm" />
            </label>
          </div>
        )}
      </div>

      <button
        onClick={exportarPDF}
        disabled={exporting}
        className="mt-3 w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50"
      >
        <FileDown className="size-4" />
        {exporting ? "Gerando PDF..." : "Exportar PDF"}
      </button>

      {dados.buckets.map((b) => (
        <Bloco key={b.titulo} titulo={b.titulo} rows={b.rows} total={b.total} />
      ))}

      <section className="ep-card mt-4 space-y-2">
        <h3 className="font-semibold mb-2">Resumo</h3>
        <Linha label="Total bruto" valor={BRL(dados.totalBruto)} pos />
        <Linha label="Combustível" valor={`- ${BRL(dados.combustivel)}`} neg />
        <Linha label="Outras despesas" valor={`- ${BRL(dados.outras)}`} neg />
        <div className="border-t border-border my-2" />
        <Linha label="Lucro líquido" valor={BRL(dados.lucro)} pos big />
      </section>
    </AppShell>
  );
}

function Bloco({ titulo, rows, total }: { titulo: string; rows: LancRow[]; total: number }) {
  return (
    <section className="ep-card mt-4">
      <h3 className="font-semibold mb-2">{titulo}</h3>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sem lançamentos neste período.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((l) => (
            <div key={l.id} className="ep-stat-tile">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{fmtData(l.data)} — {diaSemana(l.data)}</span>
                <span className="font-semibold text-primary">{BRL(l.valor)}</span>
              </div>
              <div className="mt-1 text-sm font-medium">
                {l.cidade} {l.romaneio !== "—" && <span className="text-muted-foreground">• Rom. {l.romaneio}</span>}
              </div>
              <div className="text-xs text-muted-foreground">Pacotes: {NUM(l.pacotes)}</div>
              {l.observacao && (<div className="text-xs text-muted-foreground mt-1 italic">"{l.observacao}"</div>)}
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-sm border-t border-border pt-2">
        <span className="text-muted-foreground">Total</span>
        <span className="font-bold ep-money-pos">{BRL(total)}</span>
      </div>
    </section>
  );
}

function Linha({ label, valor, pos, neg, big }: { label: string; valor: string; pos?: boolean; neg?: boolean; big?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${pos ? "ep-money-pos" : neg ? "ep-money-neg" : ""} ${big ? "text-lg font-bold" : "font-medium"}`}>{valor}</span>
    </div>
  );
}
