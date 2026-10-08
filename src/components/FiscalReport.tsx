import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Building2, UserRound, FileDown, Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { BRL } from "@/lib/calc";
import { fiscalQuery } from "@/lib/fiscal-data";
import { fiscalCSV, fiscalLabels, fiscalSummary, type FiscalClass } from "@/lib/fiscal";

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const classEntries = Object.entries(fiscalLabels) as [FiscalClass, string][];

export function FiscalReport() {
  const [year, setYear] = useState(new Date().getFullYear());
  return <AppShell title="CNPJ e CPF" back="/financeiro">
    <FiscalPeriod year={year} setYear={setYear} />
  </AppShell>;
}

function FiscalPeriod({ year, setYear }: { year: number; setYear: (year: number) => void }) {
  const { data: rows } = useSuspenseQuery(fiscalQuery(year));
  const [month, setMonth] = useState("todos");
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const periodRows = useMemo(() => rows.filter((row) => month === "todos" || Number(row.data.slice(5, 7)) === Number(month)), [rows, month]);
  const shown = useMemo(() => periodRows.filter((row) => (filter === "todos" || row.classification === filter) && `${row.descricao} ${row.categoria}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [periodRows, filter, search]);
  const period = month === "todos" ? `Ano ${year}` : `${months[Number(month) - 1]} de ${year}`;
  const visible = shown.slice(0, page * 30);

  function downloadCSV() {
    const url = URL.createObjectURL(new Blob([fiscalCSV(shown)], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `entrega-pro-${filter}-${year}-${month}.csv`; anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPDF() {
    setExporting(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const doc = new jsPDF();
      doc.setFontSize(17); doc.text("Entrega Pro - CNPJ e CPF", 14, 18);
      doc.setFontSize(10); doc.text(`${period} | ${filter === "todos" ? "CNPJ e CPF" : fiscalLabels[filter as FiscalClass]}`, 14, 26);
      doc.text("Organização financeira. Não calcula imposto nem substitui declarações oficiais.", 14, 33);
      const groups = filter === "todos" ? ["cnpj", "cpf"] as const : filter === "cnpj" || filter === "cpf" ? [filter] as const : [];
      let y = 48;
      for (const group of groups) {
        const summary = fiscalSummary(periodRows, group);
        doc.text(`${fiscalLabels[group]}: receitas ${BRL(summary.receitas)} | despesas ${BRL(summary.despesas)} | saldo ${BRL(summary.saldo)}`, 14, y);
        y += 8;
      }
      autoTable(doc, { startY: y + 3, head: [["Data", "Classificação", "Tipo", "Descrição / origem", "Valor"]], body: shown.map((row) => [row.data.split("-").reverse().join("/"), fiscalLabels[row.classification], row.tipo === "entrada" ? "Receita" : "Despesa", `${row.descricao || row.categoria} (${row.origem})`, BRL(row.valor)]), styles: { fontSize: 8, overflow: "linebreak" }, margin: { left: 14, right: 14 } });
      doc.save(`entrega-pro-${filter}-${year}-${month}.pdf`);
    } catch { toast.error("Não foi possível gerar o PDF."); }
    finally { setExporting(false); }
  }

  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3">
      <Select value={String(year)} onValueChange={(value) => { setYear(Number(value)); setPage(1); }}>
        <SelectTrigger aria-label="Ano"><SelectValue /></SelectTrigger>
        <SelectContent>{Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((value) => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={month} onValueChange={(value) => { setMonth(value); setPage(1); }}>
        <SelectTrigger aria-label="Período"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="todos">Ano inteiro</SelectItem>{months.map((label, i) => <SelectItem key={label} value={String(i + 1)}>{label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {(["cnpj", "cpf"] as const).map((group) => {
        const summary = fiscalSummary(periodRows, group);
        const Icon = group === "cnpj" ? Building2 : UserRound;
        return <section key={group} className="border-t border-border py-4" aria-label={fiscalLabels[group]}>
          <h2 className="flex items-center gap-2 font-semibold"><Icon className="size-5 text-primary" />{fiscalLabels[group]}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Receitas</dt><dd className="font-semibold text-primary" data-testid={`${group}-receitas`}>{BRL(summary.receitas)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Despesas</dt><dd className="font-semibold">{BRL(summary.despesas)}</dd></div>
            <div className="flex justify-between gap-2 border-t border-border pt-2"><dt>Saldo registrado</dt><dd className="font-semibold">{BRL(summary.saldo)}</dd></div>
          </dl>
        </section>;
      })}
    </div>
    <div className="border-l-2 border-primary pl-3 text-sm text-muted-foreground space-y-2">
      <p>Saldo não é renda tributável. Este relatório não calcula impostos nem substitui a DASN-SIMEI ou a declaração de IRPF.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={exporting || shown.length === 0} onClick={downloadPDF}>{exporting ? <Loader2 className="animate-spin" /> : <FileDown />}PDF</Button>
      <Button variant="outline" disabled={shown.length === 0} onClick={downloadCSV}><Download />Planilha CSV</Button>
    </div>
    <section className="border-t border-border pt-4 space-y-3">
      <h2 className="font-semibold">Registros · {period}</h2>
      <Select value={filter} onValueChange={(value) => { setFilter(value); setPage(1); }}>
        <SelectTrigger aria-label="Filtrar CNPJ ou CPF"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="todos">CNPJ e CPF</SelectItem>{classEntries.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
      </Select>
      <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Buscar registro" placeholder="Buscar registro" className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
      {visible.length === 0 ? <p className="py-8 text-center text-muted-foreground">Nenhum registro neste período ou filtro.</p> : <ul className="divide-y divide-border">
        {visible.map((row) => <li key={row.id} className="py-4 space-y-2" data-movement-id={row.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="font-medium break-words">{row.descricao || row.categoria}</p><p className="text-xs text-muted-foreground mt-1">{row.data.split("-").reverse().join("/")} · {row.categoria} · {row.origem}</p></div>
            <div className="shrink-0 text-right"><p className="font-semibold">{BRL(row.valor)}</p><p className="text-xs text-muted-foreground">{row.tipo === "entrada" ? "Receita" : "Despesa"}</p></div>
          </div>
          <p className="text-xs font-medium text-muted-foreground">{fiscalLabels[row.classification]}</p>
        </li>)}
      </ul>}
      {shown.length > visible.length && <Button variant="outline" className="w-full" onClick={() => setPage((value) => value + 1)}>Carregar mais</Button>}
      <p className="text-xs text-muted-foreground">{shown.length} registro(s) no filtro. PDF e CSV incluem todos os registros do filtro.</p>
    </section>
  </div>;
}
