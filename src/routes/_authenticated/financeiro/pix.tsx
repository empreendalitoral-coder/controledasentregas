import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ConfirmAction } from "@/components/ConfirmAction";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { BRL } from "@/lib/calc";
import { Button } from "@/components/ui/button";

type Pix = { id: string; data: string; valor: number; contato: string | null; descricao: string | null };

export const Route = createFileRoute("/_authenticated/financeiro/pix")({
  head: () => ({
    meta: [
      { title: "PIX — Entrega Pro" },
      { name: "description", content: "Controle de PIX recebidos e enviados, com pagador, destinatário e totais." },
      { property: "og:title", content: "PIX — Entrega Pro" },
      { property: "og:description", content: "Controle de PIX recebidos e enviados, com pagador, destinatário e totais." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/financeiro/pix" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/financeiro/pix" }],
  }),
  component: PixPage,
});

function PixPage() {
  const [saving, setSaving] = useState(false);
  const mutationBusy = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<"recebidos" | "enviados">("recebidos");
  const [items, setItems] = useState<Pix[]>([]);
  const [form, setForm] = useState({ valor: "", contato: "", descricao: "" });

  async function load() {
    setLoadError(null);
    try {
    const { data: u, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!u.user) throw new Error("Sua sessão expirou. Entre novamente.");
    const table = tab === "recebidos" ? "pix_recebidos" : "pix_enviados";
    const { data, error } = await supabase.from(table).select("*").eq("user_id", u.user.id).order("data", { ascending: false }).limit(50);
    if (error) throw error;
    if (data) {
      setItems(data.map((d) => ({
        id: d.id,
        data: d.data,
        valor: Number(d.valor),
        contato: tab === "recebidos" ? (d as { pagador: string | null }).pagador : (d as { destinatario: string | null }).destinatario,
        descricao: d.descricao,
      })));
    }
  
    } catch {
      setLoadError("Não foi possível carregar seus registros. Tente novamente.");
    }
  }
  useEffect(() => { load(); }, [tab]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    setSaving(true);
    try {
    
    const { data: u, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!u.user) throw new Error("Sua sessão expirou. Entre novamente.");
    const base = {
      user_id: u.user.id,
      data: new Date().toISOString().slice(0, 10),
      valor: Number(form.valor),
      descricao: form.descricao || null,
    };
    const error = tab === "recebidos"
      ? (await supabase.from("pix_recebidos").insert({ ...base, pagador: form.contato || null })).error
      : (await supabase.from("pix_enviados").insert({ ...base, destinatario: form.contato || null })).error;
    if (error) throw error;
    setForm({ valor: "", contato: "", descricao: "" });
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
    const table = tab === "recebidos" ? "pix_recebidos" : "pix_enviados";
    const { error } = await supabase.from(table).delete().eq("id", id).select("id").single();
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

  const total = items.reduce((s, i) => s + i.valor, 0);

  return (
    <AppShell title="PIX" back="/financeiro">
      {loadError && <div role="alert" className="mb-4 text-sm text-destructive">{loadError}<Button variant="outline" onClick={() => { void load(); }}>Tentar novamente</Button></div>}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-secondary/50">
        <Button disabled={saving} onClick={() => setTab("recebidos")} className={`h-10 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${tab === "recebidos" ? "bg-success text-success-foreground" : "text-muted-foreground"}`}>
          <ArrowDownCircle className="size-4" /> Recebidos
        </Button>
        <Button disabled={saving} onClick={() => setTab("enviados")} className={`h-10 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${tab === "enviados" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"}`}>
          <ArrowUpCircle className="size-4" /> Enviados
        </Button>
      </div>

      <div className="ep-stat-tile mt-3 text-center">
        <div className="ep-label">Total {tab}</div>
        <div className={`text-2xl font-bold ${tab === "recebidos" ? "ep-money-pos" : "ep-money-neg"}`}>{BRL(total)}</div>
      </div>

      <form onSubmit={add} className="mt-4 ep-card space-y-2">
        <input disabled={saving} className="ep-input" type="number" step="0.01" placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
        <input disabled={saving} className="ep-input" placeholder={tab === "recebidos" ? "Pagador" : "Destinatário"} value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
        <input disabled={saving} className="ep-input" placeholder="Descrição (opcional)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <Button type="submit" disabled={saving} className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold"><Plus className="size-4 inline mr-1" /> Lançar PIX</Button>
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
            <ConfirmAction disabled={saving} title="Excluir PIX?" description="Este registro será removido permanentemente." confirmLabel="Excluir" destructive onConfirm={() => remove(i.id)} trigger={<Button aria-label="Excluir" variant="ghost" size="icon" disabled={saving} className="text-destructive ml-2"><Trash2 className="size-4" /></Button>} />
          </li>
        ))}
        {items.length === 0 && <li className="py-6 text-center text-muted-foreground text-sm">Nenhum PIX</li>}
      </ul>
    </AppShell>
  );
}
