import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { BRL } from "@/lib/calc";

type Item = { id: string; data: string; tipo: "entrada" | "saida"; categoria: string; descricao: string | null; valor: number };

export const Route = createFileRoute("/_authenticated/financeiro/fluxo")({
  head: () => ({ meta: [{ title: "Fluxo de Caixa — Entrega Pro" }] }),
  component: FluxoPage,
});

function FluxoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<{ tipo: "entrada" | "saida"; categoria: string; valor: string; descricao: string }>({
    tipo: "entrada", categoria: "Entregas", valor: "", descricao: "",
  });

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("fluxo_caixa").select("*").eq("user_id", u.user.id).order("data", { ascending: false }).limit(100);
    if (data) setItems(data.map((d) => ({ ...d, valor: Number(d.valor) })) as Item[]);
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
  async function remove(id: string) { await supabase.from("fluxo_caixa").delete().eq("id", id); load(); }

  const entradas = items.filter((i) => i.tipo === "entrada").reduce((s, i) => s + i.valor, 0);
  const saidas = items.filter((i) => i.tipo === "saida").reduce((s, i) => s + i.valor, 0);

  return (
    <AppShell title="Fluxo de Caixa" back="/financeiro">
      <div className="grid grid-cols-3 gap-2">
        <div className="ep-stat-tile"><div className="ep-label">Entradas</div><div className="ep-value ep-money-pos">{BRL(entradas)}</div></div>
        <div className="ep-stat-tile"><div className="ep-label">Saídas</div><div className="ep-value ep-money-neg">{BRL(saidas)}</div></div>
        <div className="ep-stat-tile"><div className="ep-label">Saldo</div><div className={`ep-value ${entradas - saidas >= 0 ? "ep-money-pos" : "ep-money-neg"}`}>{BRL(entradas - saidas)}</div></div>
      </div>

      <form onSubmit={add} className="mt-4 ep-card space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setForm({ ...form, tipo: "entrada" })} className={`h-11 rounded-md font-semibold flex items-center justify-center gap-2 ${form.tipo === "entrada" ? "bg-success text-success-foreground" : "bg-secondary"}`}><ArrowDownCircle className="size-4" /> Entrada</button>
          <button type="button" onClick={() => setForm({ ...form, tipo: "saida" })} className={`h-11 rounded-md font-semibold flex items-center justify-center gap-2 ${form.tipo === "saida" ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}><ArrowUpCircle className="size-4" /> Saída</button>
        </div>
        <input className="ep-input" placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required />
        <input className="ep-input" placeholder="Descrição (opcional)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <input className="ep-input" type="number" step="0.01" placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
        <button className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold"><Plus className="size-4 inline mr-1" /> Lançar</button>
      </form>

      <ul className="mt-4 ep-card divide-y divide-border">
        {items.map((i) => (
          <li key={i.id} className="py-3 flex items-center gap-2">
            {i.tipo === "entrada" ? <ArrowDownCircle className="size-5 text-success" /> : <ArrowUpCircle className="size-5 text-destructive" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{i.categoria}</div>
              <div className="text-xs text-muted-foreground truncate">{i.descricao || new Date(i.data + "T00:00:00").toLocaleDateString("pt-BR")}</div>
            </div>
            <div className={`font-bold ${i.tipo === "entrada" ? "ep-money-pos" : "ep-money-neg"}`}>{i.tipo === "saida" ? "- " : ""}{BRL(i.valor)}</div>
            <button onClick={() => remove(i.id)} className="text-destructive ml-2"><Trash2 className="size-4" /></button>
          </li>
        ))}
        {items.length === 0 && <li className="py-6 text-center text-muted-foreground text-sm">Nenhum lançamento</li>}
      </ul>
    </AppShell>
  );
}
