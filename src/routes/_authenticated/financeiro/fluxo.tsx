import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import { BRL } from "@/lib/calc";
import { loadFinanceiroUnificado, totalizar, type UnifiedRow } from "@/lib/financeiro-aggregate";

export const Route = createFileRoute("/_authenticated/financeiro/fluxo")({
  head: () => ({ meta: [{ title: "Fluxo de Caixa — Entrega Pro" }] }),
  component: FluxoPage,
});

function FluxoPage() {
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{ tipo: "entrada" | "saida"; categoria: string; valor: string; descricao: string }>({
    tipo: "entrada", categoria: "Outros", valor: "", descricao: "",
  });

  async function load() {
    setLoading(true);
    try {
      const all = await loadFinanceiroUnificado();
      setRows(all.slice(0, 200));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("fluxo_caixa").insert({
      user_id: u.user.id,
      data: new Date().toISOString().slice(0, 10),
      tipo: form.tipo,
      categoria: form.categoria,
      descricao: form.descricao || null,
      valor: Number(form.valor),
    });
    if (error) return toast.error(error.message);
    setForm({ ...form, valor: "", descricao: "" });
    load();
  }
  async function remove(r: UnifiedRow) {
    if (r.origem !== "fluxo_manual") {
      toast.error("Este lançamento vem de outro módulo. Edite na origem.");
      return;
    }
    const id = r.id.replace(/^flx-/, "");
    await supabase.from("fluxo_caixa").delete().eq("id", id);
    load();
  }

  const { entradas, saidas, saldo } = totalizar(rows);

  return (
    <AppShell title="Fluxo de Caixa" back="/financeiro">
      <div className="grid grid-cols-3 gap-2">
        <div className="ep-stat-tile"><div className="ep-label">Entradas</div><div className="ep-value ep-money-pos">{BRL(entradas)}</div></div>
        <div className="ep-stat-tile"><div className="ep-label">Saídas</div><div className="ep-value ep-money-neg">{BRL(saidas)}</div></div>
        <div className="ep-stat-tile"><div className="ep-label">Saldo</div><div className={`ep-value ${saldo >= 0 ? "ep-money-pos" : "ep-money-neg"}`}>{BRL(saldo)}</div></div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Integrado: entregas, recebimentos, PIX, abastec., manut., contas, cartões</span>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1 text-foreground"><RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} /> Atualizar</button>
      </div>

      <form onSubmit={add} className="mt-4 ep-card space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setForm({ ...form, tipo: "entrada" })} className={`h-11 rounded-md font-semibold flex items-center justify-center gap-2 ${form.tipo === "entrada" ? "bg-success text-success-foreground" : "bg-secondary"}`}><ArrowDownCircle className="size-4" /> Entrada</button>
          <button type="button" onClick={() => setForm({ ...form, tipo: "saida" })} className={`h-11 rounded-md font-semibold flex items-center justify-center gap-2 ${form.tipo === "saida" ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}><ArrowUpCircle className="size-4" /> Saída</button>
        </div>
        <input className="ep-input" placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required />
        <input className="ep-input" placeholder="Descrição (opcional)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <input className="ep-input" type="number" step="0.01" placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
        <button className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold"><Plus className="size-4 inline mr-1" /> Lançar avulso</button>
      </form>

      <ul className="mt-4 ep-card divide-y divide-border">
        {rows.map((i) => (
          <li key={i.id} className="py-3 flex items-center gap-2">
            {i.tipo === "entrada" ? <ArrowDownCircle className="size-5 text-success" /> : <ArrowUpCircle className="size-5 text-destructive" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{i.categoria}</div>
              <div className="text-xs text-muted-foreground truncate">{i.descricao || new Date(i.data + "T00:00:00").toLocaleDateString("pt-BR")}</div>
            </div>
            <div className="text-right">
              <div className={`font-bold ${i.tipo === "entrada" ? "ep-money-pos" : "ep-money-neg"}`}>{i.tipo === "saida" ? "- " : ""}{BRL(i.valor)}</div>
              <div className="text-[10px] text-muted-foreground">{new Date(i.data + "T00:00:00").toLocaleDateString("pt-BR")}</div>
            </div>
            {i.origem === "fluxo_manual" && (
              <button onClick={() => remove(i)} className="text-destructive ml-2"><Trash2 className="size-4" /></button>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="py-6 text-center text-muted-foreground text-sm">Nenhum movimento</li>}
      </ul>
    </AppShell>
  );
}
