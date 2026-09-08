import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Target } from "lucide-react";
import { BRL } from "@/lib/calc";

type Meta = { id: string; nome: string; valor_meta: number; valor_atual: number; icone: string | null };

export const Route = createFileRoute("/_authenticated/financeiro/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Entrega Pro" },
      { name: "description", content: "Metas financeiras com aportes e progresso até o valor desejado." },
      { property: "og:title", content: "Metas — Entrega Pro" },
      { property: "og:description", content: "Metas financeiras com aportes e progresso até o valor desejado." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/financeiro/metas" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/financeiro/metas" }],
  }),
  component: MetasPage,
});

function MetasPage() {
  const [items, setItems] = useState<Meta[]>([]);
  const [form, setForm] = useState({ nome: "", valor: "", icone: "🎯" });
  const [aporte, setAporte] = useState<Record<string, string>>({});

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("metas_financeiras").select("*").eq("user_id", u.user.id);
    if (data) setItems(data.map((d) => ({ ...d, valor_meta: Number(d.valor_meta), valor_atual: Number(d.valor_atual) })) as Meta[]);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("metas_financeiras").insert({
      user_id: u.user.id, nome: form.nome, valor_meta: Number(form.valor), icone: form.icone,
    });
    if (error) return toast.error(error.message);
    setForm({ nome: "", valor: "", icone: "🎯" });
    load();
  }
  async function aportar(m: Meta) {
    const v = Number(aporte[m.id] || 0);
    if (!v) return;
    await supabase.from("metas_financeiras").update({ valor_atual: m.valor_atual + v }).eq("id", m.id);
    setAporte({ ...aporte, [m.id]: "" });
    load();
  }
  async function remove(id: string) { await supabase.from("metas_financeiras").delete().eq("id", id); load(); }

  return (
    <AppShell title="Metas Financeiras" back="/financeiro">
      <form onSubmit={add} className="ep-card space-y-2">
        <h3 className="font-semibold flex items-center gap-2"><Target className="size-4" /> Nova meta</h3>
        <input className="ep-input" placeholder="Nome (ex: Moto nova)" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <div className="grid grid-cols-3 gap-2">
          <input className="ep-input col-span-2" type="number" step="0.01" placeholder="Valor da meta" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
          <input className="ep-input text-center text-xl" maxLength={2} value={form.icone} onChange={(e) => setForm({ ...form, icone: e.target.value })} />
        </div>
        <button className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold"><Plus className="size-4 inline mr-1" /> Criar meta</button>
      </form>

      <div className="mt-4 space-y-3">
        {items.map((m) => {
          const pct = m.valor_meta > 0 ? Math.min(100, Math.round((m.valor_atual / m.valor_meta) * 100)) : 0;
          return (
            <div key={m.id} className="ep-card">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-lg bg-secondary grid place-items-center text-2xl">{m.icone || "🎯"}</div>
                <div className="flex-1">
                  <div className="font-semibold">{m.nome}</div>
                  <div className="text-xs text-muted-foreground">{BRL(m.valor_atual)} de {BRL(m.valor_meta)}</div>
                </div>
                <button onClick={() => remove(m.id)} className="text-destructive"><Trash2 className="size-4" /></button>
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-right text-xs font-medium text-primary">{pct}%</div>
              <div className="mt-2 flex gap-2">
                <input
                  className="ep-input flex-1"
                  type="number"
                  step="0.01"
                  placeholder="Adicionar aporte"
                  value={aporte[m.id] || ""}
                  onChange={(e) => setAporte({ ...aporte, [m.id]: e.target.value })}
                />
                <button onClick={() => aportar(m)} className="h-11 px-4 rounded-md bg-success text-success-foreground font-semibold">+ Guardar</button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">Nenhuma meta cadastrada</div>}
      </div>
    </AppShell>
  );
}
