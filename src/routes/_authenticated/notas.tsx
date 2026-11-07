import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Download, FileText, LoaderCircle, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRL } from "@/lib/calc";
import { CATEGORIAS_NOTA, normalizarLeitura, notasCSV, tipoLabel, validarArquivoNota, validarDespesaNota, type LeituraNota, type TipoDocumento, type CategoriaNota } from "@/lib/notas";
import { notasQuery, salvarNota, excluirNota, type DespesaNota } from "@/lib/notas-data";
import { lerNotaFn } from "@/lib/notas.functions";

export const Route = createFileRoute("/_authenticated/notas")({
  head: () => ({ meta: [
    { title: "Notas e recibos — Entrega Pro" }, { name: "description", content: "Organize notas fiscais e recibos em uma tabela de despesas exportável." },
    { property: "og:title", content: "Notas e recibos — Entrega Pro" }, { property: "og:description", content: "Revise valores, categorias e documentos das suas despesas." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notasQuery), component: NotasPage,
  pendingComponent: () => <AppShell title="Notas e recibos" back="/mais"><p className="ep-empty">Carregando despesas…</p></AppShell>,
  errorComponent: ({ reset }) => <AppShell title="Notas e recibos" back="/mais"><p role="alert" className="my-6">Não foi possível carregar as despesas.</p><Button onClick={reset}>Tentar novamente</Button></AppShell>,
});

function NotasPage() {
  const { data: rows } = useSuspenseQuery(notasQuery);
  const queryClient = useQueryClient();
  const ler = useServerFn(lerNotaFn);
  const fileInput = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string>();
  const [draft, setDraft] = useState<LeituraNota>(() => normalizarLeitura({}));
  const [value, setValue] = useState("");
  const [readError, setReadError] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [category, setCategory] = useState("todas");
  const filtered = rows.filter(r => (!month || r.data.startsWith(month)) && (category === "todas" || r.categoria === category) && `${r.fornecedor ?? ""} ${r.descricao ?? ""} ${r.cnpj_emitente ?? ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  function review(note?: DespesaNota) {
    const next = normalizarLeitura(note ?? {});
    setEditing(note?.id); setDraft(next); setValue(note ? String(next.valor) : ""); setReadError(""); setOpen(true);
  }
  async function upload(file?: File) {
    if (!file || reading || saving) return;
    try { validarArquivoNota(file.type, file.size); } catch (e) { toast.error(e instanceof Error ? e.message : "Arquivo inválido"); return; }
    review(); setReading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Arquivo inválido"));
        reader.onerror = () => reject(new Error("Não foi possível abrir o arquivo."));
        reader.readAsDataURL(file);
      });
      const result = await ler({ data: { dataUrl } });
      setDraft(result); setValue(result.valor ? String(result.valor) : "");
    } catch (e) { setReadError(e instanceof Error ? e.message : "Não foi possível ler. Preencha manualmente."); }
    finally { setReading(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (reading || saving) return;
    const next = { ...draft, valor: Number(value.replace(",", ".")) };
    try { validarDespesaNota(next); } catch (err) { toast.error(err instanceof Error ? err.message : "Dados inválidos"); return; }
    setSaving(true);
    try {
      const saved = await salvarNota(next, editing);
      queryClient.setQueryData(notasQuery.queryKey, (old: DespesaNota[] | undefined) => [saved, ...(old ?? []).filter(r => r.id !== saved.id)].sort((a,b) => b.data.localeCompare(a.data)));
      setOpen(false); toast.success("Despesa salva");
    } catch { toast.error("Não foi possível salvar. Seus dados foram mantidos."); }
    finally { setSaving(false); }
  }
  function exportCSV() {
    const url = URL.createObjectURL(new Blob([notasCSV(filtered)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `entrega-pro-despesas-${month || "todas"}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const disabled = reading || saving;
  return <AppShell title="Notas e recibos" back="/mais">
    <input type="file" ref={fileInput} className="hidden" aria-label="Enviar nota ou recibo" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={disabled} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; void upload(file); }} />
    <div className="flex flex-wrap gap-2 mb-5"><Button disabled={disabled} onClick={() => fileInput.current?.click()}><Upload className="size-4" />Enviar documento</Button><Button variant="outline" disabled={disabled} onClick={() => review()}><Plus className="size-4" />Adicionar</Button><Button variant="outline" disabled={!filtered.length} onClick={exportCSV}><Download className="size-4" />CSV</Button></div>
    <div className="grid grid-cols-2 gap-3 mb-5"><div className="ep-stat-tile min-w-0"><div className="ep-label">Despesas</div><div className="mt-2 text-lg font-semibold break-words">{BRL(filtered.reduce((s,r) => s + Number(r.valor), 0))}</div></div><div className="ep-stat-tile"><div className="ep-label">Documentos</div><div className="mt-2 text-lg font-semibold">{filtered.length}</div></div></div>
    <div className="grid gap-3 sm:grid-cols-3 mb-5"><Input aria-label="Buscar despesas" placeholder="Buscar fornecedor ou descrição" value={search} onChange={e => setSearch(e.target.value)} /><Input aria-label="Mês das despesas" type="month" value={month} onChange={e => setMonth(e.target.value)} /><Select value={category} onValueChange={setCategory}><SelectTrigger aria-label="Filtrar categoria"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as categorias</SelectItem>{CATEGORIAS_NOTA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
    {!filtered.length ? <div className="ep-empty"><FileText className="size-8 mb-3 text-primary" /><strong>{rows.length ? "Nenhuma despesa neste filtro" : "Nenhuma despesa registrada"}</strong></div> : <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]"><caption className="sr-only">Despesas de notas fiscais e recibos</caption><thead><tr className="border-b border-border text-left text-muted-foreground">{["Data", "Fornecedor", "Categoria", "Documento", "Valor", "Ações"].map(h => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead><tbody>{filtered.map(r => <tr key={r.id} className="border-b border-border"><td className="p-3 whitespace-nowrap">{r.data.split("-").reverse().join("/")}</td><td className="p-3 max-w-48 break-words">{r.fornecedor || "—"}{r.descricao && <div className="text-xs text-muted-foreground mt-1">{r.descricao}</div>}</td><td className="p-3">{r.categoria}</td><td className="p-3">{tipoLabel[r.tipo_documento as TipoDocumento]}</td><td className="p-3 whitespace-nowrap font-semibold">{BRL(Number(r.valor))}</td><td className="p-2"><div className="flex"><Button variant="ghost" size="icon" aria-label="Editar despesa" title="Editar despesa" onClick={() => review(r)}><Pencil className="size-4" /></Button><ConfirmAction title="Excluir despesa?" description="O registro será excluído permanentemente." destructive confirmLabel="Excluir" onConfirm={async () => { await excluirNota(r.id); queryClient.setQueryData(notasQuery.queryKey, (old: DespesaNota[] | undefined) => old?.filter(item => item.id !== r.id)); toast.success("Despesa excluída"); }} trigger={<Button variant="ghost" size="icon" aria-label="Excluir despesa" title="Excluir despesa"><Trash2 className="size-4 text-destructive" /></Button>} /></div></td></tr>)}</tbody></table></div>}
    <Dialog open={open} onOpenChange={v => { if (!disabled) setOpen(v); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Editar despesa" : "Revisar despesa"}</DialogTitle><DialogDescription>Confira a data, o valor e a categoria antes de salvar.</DialogDescription></DialogHeader>
      {reading && <p role="status" className="flex items-center gap-2 text-primary"><LoaderCircle className="size-4 animate-spin" />Lendo documento…</p>}{readError && <p role="alert" className="text-sm text-destructive">{readError}</p>}
      <form onSubmit={save} className="space-y-4"><label className="block text-sm space-y-2">Data<Input aria-label="Data da despesa" type="date" required value={draft.data} disabled={disabled} onChange={e => setDraft({ ...draft, data: e.target.value })} /></label><label className="block text-sm space-y-2">Valor (R$)<Input aria-label="Valor da despesa" inputMode="decimal" required value={value} disabled={disabled} onChange={e => setValue(e.target.value)} /></label><label className="block text-sm space-y-2">Fornecedor<Input aria-label="Fornecedor" maxLength={200} value={draft.fornecedor} disabled={disabled} onChange={e => setDraft({ ...draft, fornecedor: e.target.value })} /></label><label className="block text-sm space-y-2">CNPJ emitente<Input aria-label="CNPJ emitente" maxLength={30} value={draft.cnpj_emitente} disabled={disabled} onChange={e => setDraft({ ...draft, cnpj_emitente: e.target.value })} /></label>
      <Select disabled={disabled} value={draft.categoria} onValueChange={v => setDraft({ ...draft, categoria: v as CategoriaNota })}><SelectTrigger aria-label="Categoria da despesa"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIAS_NOTA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
      <Select disabled={disabled} value={draft.tipo_documento} onValueChange={v => setDraft({ ...draft, tipo_documento: v as TipoDocumento })}><SelectTrigger aria-label="Tipo de documento"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(tipoLabel).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
      <label className="block text-sm space-y-2">Descrição<Textarea aria-label="Descrição da despesa" maxLength={500} value={draft.descricao} disabled={disabled} onChange={e => setDraft({ ...draft, descricao: e.target.value })} /></label><div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" disabled={disabled} onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={disabled}>{saving ? "Salvando…" : "Salvar despesa"}</Button></div></form>
    </DialogContent></Dialog>
  </AppShell>;
}