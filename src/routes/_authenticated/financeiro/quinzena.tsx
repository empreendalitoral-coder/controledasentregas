import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useFullStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { BRL, NUM } from "@/lib/calc";
import { FileDown, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financeiro/quinzena")({
  head: () => ({
    meta: [
      { title: "Fechamento por Quinzena — Entrega Pro" },
      { name: "description", content: "Fechamento financeiro por quinzena com exportação em PDF." },
    ],
  }),
  component: QuinzenaPage,
});

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function diaSemana(dataStr: string) {
  const d = new Date(dataStr + "T00:00:00");
  return DIAS_SEMANA[d.getDay()];
}

function fmtData(dataStr: string) {
  const [y, m, d] = dataStr.split("-");
  return `${d}/${m}/${y}`;
}

type LancRow = {
  id: string;
  data: string;
  cidade: string;
  romaneio: string;
  pacotes: number;
  valor: number;
  observacao: string;
};

function QuinzenaPage() {
  const state = useFullStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [exporting, setExporting] = useState(false);

  const dados = useMemo(() => {
    const mm = String(month + 1).padStart(2, "0");
    const yy = String(year);
    const prefix = `${yy}-${mm}-`;

    const lancs: LancRow[] = state.lancamentos
      .filter((l) => l.data?.startsWith(prefix) && l.trabalhou)
      .map((l) => ({
        id: l.id,
        data: l.data,
        cidade: l.cidade || "—",
        romaneio: l.romaneio || "—",
        pacotes: l.pacotes ?? 0,
        valor: l.valor_dia ?? 0,
        observacao: l.observacao || "",
      }))
      .sort((a, b) => a.data.localeCompare(b.data));

    const q1 = lancs.filter((l) => Number(l.data.slice(8, 10)) <= 15);
    const q2 = lancs.filter((l) => Number(l.data.slice(8, 10)) > 15);
    const totalQ1 = q1.reduce((s, l) => s + l.valor, 0);
    const totalQ2 = q2.reduce((s, l) => s + l.valor, 0);
    const totalMes = totalQ1 + totalQ2;

    const combustivel = state.abastecimentos
      .filter((a) => a.data?.startsWith(prefix))
      .reduce((s, a) => s + (a.valor_total ?? 0), 0);
    const manutencoes = state.manutencoes
      .filter((m) => m.data?.startsWith(prefix))
      .reduce((s, m) => s + (m.valor ?? 0), 0);
    const outras = manutencoes;
    const lucro = totalMes - combustivel - outras;

    return { q1, q2, totalQ1, totalQ2, totalMes, combustivel, outras, lucro };
  }, [state.lancamentos, state.abastecimentos, state.manutencoes, month, year]);

  async function exportarPDF() {
    setExporting(true);
    try {
      const [{ jsPDF }, autoTableMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = (autoTableMod as unknown as { default: (doc: unknown, opts: unknown) => void }).default;

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const nome = state.motorista.nome || "Motorista";

      // Cabeçalho
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Fechamento por Quinzena", pageW / 2, 15, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Motorista: ${nome}`, 14, 25);
      doc.text(`Período: ${MESES[month]} / ${year}`, 14, 31);

      const head = [["Data", "Dia", "Cidade", "Romaneio", "Pacotes", "Valor", "Observação"]];
      const body = (rows: LancRow[]) =>
        rows.map((l) => [
          fmtData(l.data),
          diaSemana(l.data),
          l.cidade,
          l.romaneio,
          NUM(l.pacotes),
          BRL(l.valor),
          l.observacao,
        ]);

      let cursorY = 38;

      // 1ª Quinzena
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("1ª Quinzena (01 a 15)", 14, cursorY);
      cursorY += 3;
      autoTable(doc, {
        startY: cursorY,
        head,
        body: dados.q1.length ? body(dados.q1) : [["—", "—", "—", "—", "—", "—", "Sem lançamentos"]],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
        columnStyles: { 6: { cellWidth: 40 } },
      });
      // @ts-expect-error autoTable augments doc at runtime
      cursorY = doc.lastAutoTable.finalY + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Total 1ª Quinzena: ${BRL(dados.totalQ1)}`, pageW - 14, cursorY, { align: "right" });
      cursorY += 8;

      // 2ª Quinzena
      doc.setFontSize(12);
      doc.text("2ª Quinzena (16 ao fim do mês)", 14, cursorY);
      cursorY += 3;
      autoTable(doc, {
        startY: cursorY,
        head,
        body: dados.q2.length ? body(dados.q2) : [["—", "—", "—", "—", "—", "—", "Sem lançamentos"]],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
        columnStyles: { 6: { cellWidth: 40 } },
      });
      // @ts-expect-error see above
      cursorY = doc.lastAutoTable.finalY + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Total 2ª Quinzena: ${BRL(dados.totalQ2)}`, pageW - 14, cursorY, { align: "right" });
      cursorY += 10;

      // Totais
      autoTable(doc, {
        startY: cursorY,
        body: [
          ["Total do mês", BRL(dados.totalMes)],
          ["Combustível", `- ${BRL(dados.combustivel)}`],
          ["Outras despesas", `- ${BRL(dados.outras)}`],
          ["Lucro líquido", BRL(dados.lucro)],
        ],
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: "bold" },
          1: { halign: "right", fontStyle: "bold" },
        },
      });

      doc.save(`fechamento-quinzena-${yy(year)}-${String(month + 1).padStart(2, "0")}.pdf`);
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar PDF");
    } finally {
      setExporting(false);
    }
  }

  function prev() {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
  }

  return (
    <AppShell title="Fechamento por Quinzena" back="/financeiro">
      <div className="ep-card flex items-center justify-between">
        <button onClick={prev} className="px-3 py-1 text-primary">←</button>
        <div className="font-semibold flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          {MESES[month]} / {year}
        </div>
        <button onClick={next} className="px-3 py-1 text-primary">→</button>
      </div>

      <button
        onClick={exportarPDF}
        disabled={exporting}
        className="mt-3 w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50"
      >
        <FileDown className="size-4" />
        {exporting ? "Gerando PDF..." : "Exportar PDF"}
      </button>

      <Quinzena titulo="1ª Quinzena (01 a 15)" rows={dados.q1} total={dados.totalQ1} />
      <Quinzena titulo="2ª Quinzena (16 ao fim do mês)" rows={dados.q2} total={dados.totalQ2} />

      <section className="ep-card mt-4 space-y-2">
        <h3 className="font-semibold mb-2">Resumo do mês</h3>
        <Linha label="Total do mês" valor={BRL(dados.totalMes)} pos />
        <Linha label="Combustível" valor={`- ${BRL(dados.combustivel)}`} neg />
        <Linha label="Outras despesas" valor={`- ${BRL(dados.outras)}`} neg />
        <div className="border-t border-border my-2" />
        <Linha label="Lucro líquido" valor={BRL(dados.lucro)} pos big />
      </section>
    </AppShell>
  );
}

function yy(y: number) { return String(y); }

function Quinzena({ titulo, rows, total }: { titulo: string; rows: LancRow[]; total: number }) {
  return (
    <section className="ep-card mt-4">
      <h3 className="font-semibold mb-2">{titulo}</h3>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sem lançamentos nesta quinzena.</div>
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
              <div className="text-xs text-muted-foreground">
                Pacotes: {NUM(l.pacotes)}
              </div>
              {l.observacao && (
                <div className="text-xs text-muted-foreground mt-1 italic">"{l.observacao}"</div>
              )}
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
      <span className={`${pos ? "ep-money-pos" : neg ? "ep-money-neg" : ""} ${big ? "text-lg font-bold" : "font-medium"}`}>
        {valor}
      </span>
    </div>
  );
}
