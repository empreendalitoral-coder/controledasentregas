import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { actions, useFullStore, type Multa } from "@/lib/store";
import { BRL } from "@/lib/calc";
import { Check, Pencil, Plus, ReceiptText, Trash2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/multas")({
  head: () => ({ meta: [
    { title: "Multas — Entrega Pro" },
    { name: "description", content: "Controle suas multas pagas e pendentes no Entrega Pro." },
    { property: "og:title", content: "Multas — Entrega Pro" },
    { property: "og:description", content: "Organize datas, valores e pagamentos das multas do veículo." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }), component: MultasPage,
});

function MultasPage() {
  const state = useFullStore();
  const [filter, setFilter] = useState("todas");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Multa | null>(null);
  const [data, setData] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<Multa["status"]>("pendente");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const list = [...state.multas].filter(m => filter === "todas" || m.status === filter).sort((a,b) => b.data.localeCompare(a.data));
  function edit(m?: Multa) {
    setEditing(m ?? null);
    const now = new Date();
    setData(m?.data ?? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`);
    setValor(m ? String(m.valor) : ""); setDescricao(m?.descricao ?? ""); setStatus(m?.status ?? "pendente"); setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const number = Number(valor.replace(",", "."));
    if (!data || !Number.isFinite(number) || number <= 0 || number > 9999999999.99) return toast.error("Informe a data e um valor válido maior que zero.");
    setSaving(true);
    try { await actions.saveMulta({ data, valor: number, descricao: descricao.trim(), status }, editing?.id); toast.success(editing ? "Multa atualizada" : "Multa registrada"); setOpen(false); }
    catch { toast.error("Não foi possível salvar a multa. Tente novamente."); }
    finally { setSaving(false); }
  }
  async function pay(m: Multa) {
    setBusy(m.id);
    try { await actions.saveMulta({ ...m, status: "paga" }, m.id); toast.success("Multa marcada como paga"); }
    catch { toast.error("Não foi possível atualizar a multa"); } finally { setBusy(null); }
  }
  async function remove(id: string) {
    try { await actions.deleteMulta(id); toast.success("Multa excluída"); } catch { toast.error("Não foi possível excluir a multa"); throw new Error("Falha na exclusão"); }
  }
  return <AppShell title="Multas" back="/mais" right={<Button variant="ghost" size="icon" aria-label="Nova multa" onClick={() => edit()}><Plus /></Button>}>
    <div className="ep-page-intro mb-5"><div className="ep-icon-chip"><ReceiptText className="size-5" /></div><h2 className="font-display text-lg font-semibold">Multas do veículo</h2></div>
    <div className="mb-5 grid grid-cols-2 gap-3">{(["pendente", "paga"] as const).map(s => <div className="ep-stat-tile min-w-0" key={s}><div className="ep-label">{s === "paga" ? "Pagas" : "Pendentes"}</div><div className={`mt-2 break-words text-lg font-semibold ${s === "paga" ? "text-success" : "text-warning"}`}>{BRL(state.multas.filter(m => m.status === s).reduce((sum,m) => sum+m.valor,0))}</div></div>)}</div>
    <div className="mb-5 grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1" role="group" aria-label="Filtrar multas">{[["todas","Todas"],["pendente","Pendentes"],["paga","Pagas"]].map(([value,label]) => <Button key={value} size="sm" variant={filter === value ? "default" : "ghost"} onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</Button>)}</div>
    {!state.hydrated ? <div className="ep-empty">Carregando multas…</div> : list.length === 0 ? <div className="ep-empty"><ReceiptText className="mb-3 size-8 text-primary" /><strong className="text-foreground">{state.multas.length ? "Nenhuma multa neste filtro" : "Nenhuma multa registrada"}</strong><Button variant="outline" className="mt-4" onClick={() => edit()}><Plus />Adicionar multa</Button></div> : <div className="space-y-3">{list.map(m => <article className="ep-card" key={m.id}>
      <div className="flex items-start justify-between gap-3"><div><time className="text-xs text-muted-foreground">{new Date(m.data+"T12:00:00").toLocaleDateString("pt-BR")}</time><div className="mt-1 text-xl font-semibold">{BRL(m.valor)}</div></div><span className={`text-xs font-semibold ${m.status === "paga" ? "text-success" : "text-warning"}`}>{m.status === "paga" ? "Paga" : "Pendente"}</span></div>
      {m.descricao && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{m.descricao}</p>}
      <div className="mt-3 flex items-center gap-1 border-t border-border pt-2">{m.status === "pendente" && <Button size="sm" variant="outline" disabled={busy === m.id} onClick={() => void pay(m)}>{busy === m.id ? <LoaderCircle className="animate-spin" /> : <Check />}Marcar paga</Button>}<div className="flex-1" /><Button size="icon" variant="ghost" aria-label="Editar multa" disabled={busy === m.id} onClick={() => edit(m)}><Pencil className="size-4" /></Button><ConfirmAction title="Excluir multa?" description="Este registro será excluído permanentemente." confirmLabel="Excluir" destructive onConfirm={() => remove(m.id)}><Button variant="ghost" size="icon" disabled={busy === m.id} aria-label="Excluir multa"><Trash2 className="size-4 text-destructive" /></Button></ConfirmAction></div>
    </article>)}</div>}
    <Dialog open={open} onOpenChange={v => { if (!saving) setOpen(v); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Editar multa" : "Nova multa"}</DialogTitle><DialogDescription>Dados da infração e situação do pagamento.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4">
      <label className="block space-y-2 text-sm">Data<Input type="date" aria-label="Data da multa" required value={data} onChange={e => setData(e.target.value)} disabled={saving} /></label>
      <label className="block space-y-2 text-sm">Valor (R$)<Input aria-label="Valor da multa" inputMode="decimal" required value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" disabled={saving} /></label>
      <label className="block space-y-2 text-sm">Descrição / local <span className="text-muted-foreground">(opcional)</span><Textarea aria-label="Descrição da multa" maxLength={500} value={descricao} onChange={e => setDescricao(e.target.value)} disabled={saving} /></label>
      <div className="space-y-2 text-sm"><label id="multa-status">Situação</label><Select value={status} onValueChange={v => setStatus(v as Multa["status"])} disabled={saving}><SelectTrigger aria-labelledby="multa-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="paga">Paga</SelectItem></SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar multa"}</Button></div>
    </form></DialogContent></Dialog>
  </AppShell>;
}