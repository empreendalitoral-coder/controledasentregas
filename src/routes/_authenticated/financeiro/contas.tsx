import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ConfirmAction } from "@/components/ConfirmAction";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Check, Square } from "lucide-react";
import { BRL } from "@/lib/calc";
import { Button } from "@/components/ui/button";

type Conta = { id: string; nome: string; valor: number; dia_vencimento: number; categoria: string | null; pago: boolean };

export const Route = createFileRoute("/_authenticated/financeiro/contas")({
  head: () => ({
    meta: [
      { title: "Contas Fixas — Entrega Pro" },
      { name: "description", content: "Contas fixas do mês com valor, dia de vencimento e controle de pagamento." },
      { property: "og:title", content: "Contas Fixas — Entrega Pro" },
      { property: "og:description", content: "Contas fixas do mês com valor, dia de vencimento e controle de pagamento." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/financeiro/contas" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/financeiro/contas" }],
  }),
  component: ContasPage,
});

function ContasPage() {
  const [saving, setSaving] = useState(false);
  const mutationBusy = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [items, setItems] = useState<Conta[]>([]);
  const [form, setForm] = useState({ nome: "", valor: "", dia: "5", categoria: "Casa" });

  async function load() {
    setLoadError(null);
    try {
    const { data: u, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!u.user) throw new Error("Sua sessão expirou. Entre novamente.");
    const { data, error } = await supabase.from("contas_fixas").select("*").eq("user_id", u.user.id).order("dia_vencimento");
    if (error) throw error;
    if (data) setItems(data.map((d) => ({ ...d, valor: Number(d.valor) })) as Conta[]);
  
    } catch {
      setLoadError("Não foi possível carregar seus registros. Tente novamente.");
    }
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    setSaving(true);
    try {
    
    const { data: u, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!u.user) throw new Error("Sua sessão expirou. Entre novamente.");
    const { error } = await supabase.from("contas_fixas").insert({
      user_id: u.user.id,
      nome: form.nome,
      valor: Number(form.valor),
      dia_vencimento: Number(form.dia),
      categoria: form.categoria,
    });
    if (error) throw error;
    setForm({ nome: "", valor: "", dia: "5", categoria: form.categoria });
    await load();
  
    } catch (error) {
      toast.error("Não foi possível salvar a alteração. Tente novamente.");
    } finally {
      mutationBusy.current = false;
      setSaving(false);
    }
  }

  async function togglePago(c: Conta) {
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    setSaving(true);
    try {
    const { error } = await supabase.from("contas_fixas").update({ pago: !c.pago }).eq("id", c.id).select("id").single();
    if (error) throw error;
    await load();
  
    } catch (error) {
      toast.error("Não foi possível salvar a alteração. Tente novamente.");
    } finally {
      mutationBusy.current = false;
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    setSaving(true);
    try {
    const { error } = await supabase.from("contas_fixas").delete().eq("id", id).select("id").single();
    if (error) throw error;
    await load();
  
    } catch (error) {
      toast.error("Não foi possível salvar a alteração. Tente novamente.");
      throw error;
    } finally {
      mutationBusy.current = false;
      setSaving(false);
    }
  }

  const total = items.reduce((s, c) => s + c.valor, 0);
  const pagos = items.filter((c) => c.pago).reduce((s, c) => s + c.valor, 0);

  return (
    <AppShell title="Contas Fixas" back="/financeiro">
      {loadError && <div role="alert" className="mb-4 text-sm text-destructive">{loadError}<Button variant="outline" onClick={() => { void load(); }}>Tentar novamente</Button></div>}
      <div className="grid grid-cols-2 gap-2">
        <div className="ep-stat-tile"><div className="ep-label">Total mês</div><div className="ep-value">{BRL(total)}</div></div>
        <div className="ep-stat-tile"><div className="ep-label">Já pago</div><div className="ep-value ep-money-pos">{BRL(pagos)}</div></div>
      </div>

      <form onSubmit={add} className="mt-4 ep-card space-y-2">
        <h3 className="font-semibold">Nova conta</h3>
        <input disabled={saving} className="ep-input" placeholder="Nome (ex: Aluguel)" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <div className="grid grid-cols-3 gap-2">
          <input disabled={saving} className="ep-input" type="number" step="0.01" placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
          <input disabled={saving} className="ep-input" type="number" min="1" max="31" placeholder="Dia" value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })} required />
          <input disabled={saving} className="ep-input" placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
        </div>
        <Button type="submit" disabled={saving} className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"><Plus className="size-4" /> Adicionar</Button>
      </form>

      <ul className="mt-4 space-y-2">
        {items.map((c) => (
          <li key={c.id} className="ep-card flex items-center gap-3">
            <Button disabled={saving} onClick={() => togglePago(c)} className={`size-9 rounded-md grid place-items-center border ${c.pago ? "bg-success/20 border-success text-success" : "border-border text-muted-foreground"}`}>
              {c.pago ? <Check className="size-4" /> : <Square className="size-4" />}
            </Button>
            <div className="flex-1">
              <div className={`font-semibold ${c.pago ? "line-through text-muted-foreground" : ""}`}>{c.nome}</div>
              <div className="text-xs text-muted-foreground">Vence dia {c.dia_vencimento} • {c.categoria}</div>
            </div>
            <div className="text-right">
              <div className="font-bold">{BRL(c.valor)}</div>
              <ConfirmAction disabled={saving} title="Excluir conta?" description="Este registro será removido permanentemente." confirmLabel="Excluir" destructive onConfirm={() => remove(c.id)} trigger={<Button aria-label="Excluir" variant="ghost" size="icon" disabled={saving} className="text-destructive text-xs mt-1 inline-flex items-center gap-1"><Trash2 className="size-3" /> Excluir</Button>} />
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-center text-muted-foreground text-sm py-8">Nenhuma conta cadastrada</li>}
      </ul>
    </AppShell>
  );
}
