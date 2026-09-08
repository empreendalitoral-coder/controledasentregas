import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { BRL } from "@/lib/calc";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { loadFinanceiroUnificado, type UnifiedRow } from "@/lib/financeiro-aggregate";

export const Route = createFileRoute("/_authenticated/financeiro/mei")({
  head: () => ({
    meta: [
      { title: "Relatório MEI — Entrega Pro" },
      { name: "description", content: "Relatório MEI com receitas, despesas, lucro e acompanhamento do limite anual." },
      { property: "og:title", content: "Relatório MEI — Entrega Pro" },
      { property: "og:description", content: "Relatório MEI com receitas, despesas, lucro e acompanhamento do limite anual." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/financeiro/mei" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/financeiro/mei" }],
  }),
  component: MeiPage,
});

function MeiPage() {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState<number | "todos">(new Date().getMonth() + 1);
  const [rows, setRows] = useState<UnifiedRow[]>([]);

  useEffect(() => {
    (async () => {
      const data = await loadFinanceiroUnificado({
        start: `${ano}-01-01`,
        end: `${ano}-12-31`,
      });
      setRows(data);
    })();
  }, [ano]);

  const filtered = useMemo(
    () => (mes === "todos" ? rows : rows.filter((r) => new Date(r.data + "T00:00:00").getMonth() + 1 === mes)),
    [rows, mes],
  );
  const receitas = filtered.filter((r) => r.tipo === "entrada").reduce((s, r) => s + r.valor, 0);
  const despesas = filtered.filter((r) => r.tipo === "saida").reduce((s, r) => s + r.valor, 0);
  const lucro = receitas - despesas;
  const total = receitas + despesas;

  const LIMITE = 81000;
  const totalAnoReceitas = rows.filter((r) => r.tipo === "entrada").reduce((s, r) => s + r.valor, 0);
  const pctLimite = Math.min(100, Math.round((totalAnoReceitas / LIMITE) * 100));

  function imprimir() {
    const win = window.open("", "_blank");
    if (!win) { toast.error("Habilite pop-ups"); return; }
    const mesLabel = mes === "todos" ? "Anual" : `${mes}/${ano}`;
    win.document.write(`<!doctype html><html><head><meta charset='utf-8'><title>MEI ${mesLabel}</title>
<style>body{font-family:system-ui;padding:24px}h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:12px}td{padding:8px;border-bottom:1px solid #ccc}.r{text-align:right}.pos{color:#0a7f3e;font-weight:600}.neg{color:#b00020}</style>
</head><body><h1>Relatório MEI ${mesLabel}</h1>
<table>
<tr><td>Receitas</td><td class='r pos'>${BRL(receitas)}</td></tr>
<tr><td>Despesas</td><td class='r neg'>${BRL(despesas)}</td></tr>
<tr><td>Lucro</td><td class='r pos'><b>${BRL(lucro)}</b></td></tr>
<tr><td>Total movimentado</td><td class='r'>${BRL(total)}</td></tr>
</table>
<p>Faturamento ${ano}: ${BRL(totalAnoReceitas)} de ${BRL(LIMITE)} (${pctLimite}%)</p>
<script>window.print()</script></body></html>`);
    win.document.close();
  }

  return (
    <AppShell title="Relatório MEI" back="/financeiro">
      <div className="ep-card">
        <div className="grid grid-cols-2 gap-2">
          <select className="ep-input" value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => <option key={y}>{y}</option>)}
          </select>
          <select className="ep-input" value={mes} onChange={(e) => setMes(e.target.value === "todos" ? "todos" : Number(e.target.value))}>
            <option value="todos">Ano inteiro</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m.toString().padStart(2, "0")}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="ep-stat-tile"><div className="ep-label">Receitas</div><div className="ep-value ep-money-pos">{BRL(receitas)}</div></div>
        <div className="ep-stat-tile"><div className="ep-label">Despesas</div><div className="ep-value ep-money-neg">{BRL(despesas)}</div></div>
        <div className="ep-stat-tile"><div className="ep-label">Lucro</div><div className={`ep-value ${lucro >= 0 ? "ep-money-pos" : "ep-money-neg"}`}>{BRL(lucro)}</div></div>
        <div className="ep-stat-tile"><div className="ep-label">Total movimentado</div><div className="ep-value">{BRL(total)}</div></div>
      </div>

      <div className="mt-4 ep-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Limite MEI {ano}</h3>
          <span className="text-xs text-muted-foreground">R$ 81.000,00</span>
        </div>
        <div className="text-sm text-muted-foreground">Faturamento acumulado no ano: <span className="font-bold text-foreground">{BRL(totalAnoReceitas)}</span></div>
        <div className="mt-2 h-3 rounded-full bg-secondary overflow-hidden">
          <div className={`h-full ${pctLimite > 85 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pctLimite}%` }} />
        </div>
        <div className="mt-1 text-right text-xs font-medium">{pctLimite}% do limite anual</div>
      </div>

      <button onClick={imprimir} className="mt-4 w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2">
        <FileText className="size-4" /> Gerar relatório <Download className="size-4" />
      </button>
    </AppShell>
  );
}
