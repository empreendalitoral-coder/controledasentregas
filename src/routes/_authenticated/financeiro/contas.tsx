import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Check, Square } from "lucide-react";
import { BRL } from "@/lib/calc";

type Conta = { id: string; nome: string; valor: number; dia_vencimento: number; categoria: string | null; pago: boolean };

export const Route = createFileRoute("/_authenticated/financeiro/contas")({
  head: () => ({ meta: [{ title: "Contas Fixas — Entrega Pro" }] }),
  component: ContasPage,
});

function ContasPage() {
  const [items, setItems] = useState<Conta[]>([]);
  const [form, setForm] = useState({ nome: "", valor: "", dia: "5", categoria: "Casa" });

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("contas_fixas").select("*").eq("user_id", u.user.id).order("dia_vencimento");
    if (data) setItems(data.map((d) => ({ ...d, valor: Number(d.valor) })) as Conta[]);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("contas_fixas").insert({
      user_id: u.user.id,
      nome: form.nome,
      valor: Number(form.valor),
      dia_vencimento: Number(form.dia),
      categoria: form.categoria,
    });
    if (error) return toast.error(error.message);
    setForm({ nome: "", valor: "", dia: "5", categoria: form.categoria });
    load();
  }

  async function togglePago(c: Conta) {
    await supabase.from("contas_fixas").update({ pago: !c.pago }).eq("id", c.id);
    load();
  }
  async function remove(id: string) {
    await supabase.from("contas_fixas").delete().eq("id", id);
    load();
  }

  const total = items.reduce((s, c) => s + c.valor, 0);
  const pagos = items.filter((c) => c.pago).reduce((s, c) => s + c.valor, 0);

  return (
    <AppShell title="Contas Fixas" back="/financeiro">
      <div className="grid grid-cols-2 gap-2">
        <div className="ep-stat-tile"><div className="ep-label">Total mês</div><div className="ep-value">{BRL(total)}</div></div>
        <div className="ep-stat-tile"><div className="ep-label">Já pago</div><div className="ep-value ep-money-pos">{BRL(pagos)}</div></div>
      </div>

      <form onSubmit={add} className="mt-4 ep-card space-y-2">
        <h3 className="font-semibold">Nova conta</h3>
        <input className="ep-input" placeholder="Nome (ex: Aluguel)" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <div className="grid grid-cols-3 gap-2">
          <input className="ep-input" type="number" step="0.01" placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
          <input className="ep-input" type="number" min="1" max="31" placeholder="Dia" value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })} required />
          <input className="ep-input" placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
        </div>
        <button className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"><Plus className="size-4" /> Adicionar</button>
      </form>

      <ul className="mt-4 space-y-2">
        {items.map((c) => (
          <li key={c.id} className="ep-card flex items-center gap-3">
            <button onClick={() => togglePago(c)} className={`size-9 rounded-md grid place-items-center border ${c.pago ? "bg-success/20 border-success text-success" : "border-border text-muted-foreground"}`}>
              {c.pago ? <Check className="size-4" /> : <Square className="size-4" />}
            </button>
            <div className="flex-1">
              <div className={`font-semibold ${c.pago ? "line-through text-muted-foreground" : ""}`}>{c.nome}</div>
              <div className="text-xs text-muted-foreground">Vence dia {c.dia_vencimento} • {c.categoria}</div>
            </div>
            <div className="text-right">
              <div className="font-bold">{BRL(c.valor)}</div>
              <button onClick={() => remove(c.id)} className="text-destructive text-xs mt-1 inline-flex items-center gap-1"><Trash2 className="size-3" /> Excluir</button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-center text-muted-foreground text-sm py-8">Nenhuma conta cadastrada</li>}
      </ul>
    </AppShell>
  );
}
