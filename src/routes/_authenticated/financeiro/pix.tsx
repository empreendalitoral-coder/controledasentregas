import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { BRL } from "@/lib/calc";

type Pix = { id: string; data: string; valor: number; contato: string | null; descricao: string | null };

export const Route = createFileRoute("/_authenticated/financeiro/pix")({
  head: () => ({ meta: [{ title: "PIX — Entrega Pro" }] }),
  component: PixPage,
});

function PixPage() {
  const [tab, setTab] = useState<"recebidos" | "enviados">("recebidos");
  const [items, setItems] = useState<Pix[]>([]);
  const [form, setForm] = useState({ valor: "", contato: "", descricao: "" });

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const table = tab === "recebidos" ? "pix_recebidos" : "pix_enviados";
    const { data } = await supabase.from(table).select("*").eq("user_id", u.user.id).order("data", { ascending: false }).limit(50);
    if (data) {
      setItems(data.map((d) => ({
        id: d.id,
        data: d.data,
        valor: Number(d.valor),
        contato: tab === "recebidos" ? (d as { pagador: string | null }).pagador : (d as { destinatario: string | null }).destinatario,
        descricao: d.descricao,
      })));
    }
  }
  useEffect(() => { load(); }, [tab]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const base = {
      user_id: u.user.id,
      data: new Date().toISOString().slice(0, 10),
      valor: Number(form.valor),
      descricao: form.descricao || null,
    };
    const error = tab === "recebidos"
      ? (await supabase.from("pix_recebidos").insert({ ...base, pagador: form.contato || null })).error
      : (await supabase.from("pix_enviados").insert({ ...base, destinatario: form.contato || null })).error;
    if (error) return toast.error(error.message);
    setForm({ valor: "", contato: "", descricao: "" });
    load();
  }
  async function remove(id: string) {
    const table = tab === "recebidos" ? "pix_recebidos" : "pix_enviados";
    await supabase.from(table).delete().eq("id", id);
    load();
  }

  const total = items.reduce((s, i) => s + i.valor, 0);

  return (
    <AppShell title="PIX" back="/financeiro">
      <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-secondary/50">
        <button onClick={() => setTab("recebidos")} className={`h-10 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${tab === "recebidos" ? "bg-success text-success-foreground" : "text-muted-foreground"}`}>
          <ArrowDownCircle className="size-4" /> Recebidos
        </button>
        <button onClick={() => setTab("enviados")} className={`h-10 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${tab === "enviados" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"}`}>
          <ArrowUpCircle className="size-4" /> Enviados
        </button>
      </div>

      <div className="ep-stat-tile mt-3 text-center">
        <div className="ep-label">Total {tab}</div>
        <div className={`text-2xl font-bold ${tab === "recebidos" ? "ep-money-pos" : "ep-money-neg"}`}>{BRL(total)}</div>
      </div>

      <form onSubmit={add} className="mt-4 ep-card space-y-2">
        <input className="ep-input" type="number" step="0.01" placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
        <input className="ep-input" placeholder={tab === "recebidos" ? "Pagador" : "Destinatário"} value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
        <input className="ep-input" placeholder="Descrição (opcional)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <button className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold"><Plus className="size-4 inline mr-1" /> Lançar PIX</button>
      </form>

      <ul className="mt-4 ep-card divide-y divide-border">
        {items.map((i) => (
          <li key={i.id} className="py-3 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{i.contato || "Sem nome"}</div>
              <div className="text-xs text-muted-foreground truncate">
                {new Date(i.data + "T00:00:00").toLocaleDateString("pt-BR")}{i.descricao ? ` • ${i.descricao}` : ""}
              </div>
            </div>
            <div className={`font-bold ${tab === "recebidos" ? "ep-money-pos" : "ep-money-neg"}`}>{BRL(i.valor)}</div>
            <button onClick={() => remove(i.id)} className="text-destructive ml-2"><Trash2 className="size-4" /></button>
          </li>
        ))}
        {items.length === 0 && <li className="py-6 text-center text-muted-foreground text-sm">Nenhum PIX</li>}
      </ul>
    </AppShell>
  );
}
