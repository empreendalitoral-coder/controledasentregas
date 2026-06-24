import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { BRL } from "@/lib/calc";

type Cartao = { id: string; nome: string; limite: number; dia_fechamento: number; dia_vencimento: number };
type Lanc = { id: string; cartao_id: string; descricao: string; valor_total: number; parcelas: number; data_compra: string };

export const Route = createFileRoute("/_authenticated/financeiro/cartoes")({
  head: () => ({ meta: [{ title: "Cartões — Entrega Pro" }] }),
  component: CartoesPage,
});

function CartoesPage() {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [lancs, setLancs] = useState<Lanc[]>([]);
  const [novoCartao, setNovoCartao] = useState({ nome: "", limite: "", fech: "1", venc: "10" });
  const [novoLanc, setNovoLanc] = useState({ cartao_id: "", descricao: "", valor: "", parcelas: "1" });

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [c, l] = await Promise.all([
      supabase.from("cartoes_credito").select("*").eq("user_id", u.user.id),
      supabase.from("cartao_lancamentos").select("*").eq("user_id", u.user.id).order("data_compra", { ascending: false }),
    ]);
    if (c.data) setCartoes(c.data.map((x) => ({ ...x, limite: Number(x.limite) })) as Cartao[]);
    if (l.data) setLancs(l.data.map((x) => ({ ...x, valor_total: Number(x.valor_total) })) as Lanc[]);
  }
  useEffect(() => { load(); }, []);

  async function addCartao(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("cartoes_credito").insert({
      user_id: u.user.id,
      nome: novoCartao.nome,
      limite: Number(novoCartao.limite),
      dia_fechamento: Number(novoCartao.fech),
      dia_vencimento: Number(novoCartao.venc),
    });
    if (error) return toast.error(error.message);
    setNovoCartao({ nome: "", limite: "", fech: "1", venc: "10" });
    load();
  }

  async function addLanc(e: React.FormEvent) {
    e.preventDefault();
    if (!novoLanc.cartao_id) { toast.error("Escolha um cartão"); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("cartao_lancamentos").insert({
      user_id: u.user.id,
      cartao_id: novoLanc.cartao_id,
      descricao: novoLanc.descricao,
      valor_total: Number(novoLanc.valor),
      parcelas: Number(novoLanc.parcelas),
      data_compra: new Date().toISOString().slice(0, 10),
    });
    if (error) return toast.error(error.message);
    setNovoLanc({ ...novoLanc, descricao: "", valor: "", parcelas: "1" });
    load();
  }

  async function delLanc(id: string) {
    await supabase.from("cartao_lancamentos").delete().eq("id", id);
    load();
  }
  async function delCartao(id: string) {
    if (!confirm("Excluir cartão e todos seus lançamentos?")) return;
    await supabase.from("cartoes_credito").delete().eq("id", id);
    load();
  }

  function usado(cId: string) {
    return lancs.filter((l) => l.cartao_id === cId).reduce((s, l) => s + l.valor_total, 0);
  }

  return (
    <AppShell title="Cartões de Crédito" back="/financeiro">
      <form onSubmit={addCartao} className="ep-card space-y-2">
        <h3 className="font-semibold flex items-center gap-2"><CreditCard className="size-4" /> Novo cartão</h3>
        <input className="ep-input" placeholder="Nome do cartão" value={novoCartao.nome} onChange={(e) => setNovoCartao({ ...novoCartao, nome: e.target.value })} required />
        <div className="grid grid-cols-3 gap-2">
          <input className="ep-input" type="number" step="0.01" placeholder="Limite" value={novoCartao.limite} onChange={(e) => setNovoCartao({ ...novoCartao, limite: e.target.value })} required />
          <input className="ep-input" type="number" min="1" max="31" placeholder="Fech" value={novoCartao.fech} onChange={(e) => setNovoCartao({ ...novoCartao, fech: e.target.value })} required />
          <input className="ep-input" type="number" min="1" max="31" placeholder="Venc" value={novoCartao.venc} onChange={(e) => setNovoCartao({ ...novoCartao, venc: e.target.value })} required />
        </div>
        <button className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold"><Plus className="size-4 inline mr-2" />Adicionar cartão</button>
      </form>

      <div className="mt-4 space-y-3">
        {cartoes.map((c) => {
          const u = usado(c.id);
          const pct = c.limite > 0 ? Math.min(100, Math.round((u / c.limite) * 100)) : 0;
          return (
            <div key={c.id} className="ep-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{c.nome}</div>
                  <div className="text-xs text-muted-foreground">Fech {c.dia_fechamento} • Venc {c.dia_vencimento}</div>
                </div>
                <button onClick={() => delCartao(c.id)} className="text-destructive text-xs"><Trash2 className="size-4" /></button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                <span>Usado {BRL(u)}</span><span>Limite {BRL(c.limite)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div className={`h-full ${pct > 80 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-3 divide-y divide-border text-sm">
                {lancs.filter((l) => l.cartao_id === c.id).map((l) => (
                  <li key={l.id} className="py-2 flex items-center gap-2">
                    <div className="flex-1">
                      <div>{l.descricao}</div>
                      <div className="text-xs text-muted-foreground">{l.parcelas}x de {BRL(l.valor_total / l.parcelas)}</div>
                    </div>
                    <div className="text-right">
                      <div>{BRL(l.valor_total)}</div>
                      <button onClick={() => delLanc(l.id)} className="text-destructive text-xs"><Trash2 className="size-3 inline" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {cartoes.length > 0 && (
        <form onSubmit={addLanc} className="mt-4 ep-card space-y-2">
          <h3 className="font-semibold">Nova compra</h3>
          <select className="ep-input" value={novoLanc.cartao_id} onChange={(e) => setNovoLanc({ ...novoLanc, cartao_id: e.target.value })} required>
            <option value="">Selecione o cartão</option>
            {cartoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <input className="ep-input" placeholder="Descrição" value={novoLanc.descricao} onChange={(e) => setNovoLanc({ ...novoLanc, descricao: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            <input className="ep-input" type="number" step="0.01" placeholder="Valor total" value={novoLanc.valor} onChange={(e) => setNovoLanc({ ...novoLanc, valor: e.target.value })} required />
            <input className="ep-input" type="number" min="1" max="48" placeholder="Parcelas" value={novoLanc.parcelas} onChange={(e) => setNovoLanc({ ...novoLanc, parcelas: e.target.value })} required />
          </div>
          <button className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold">Adicionar compra</button>
        </form>
      )}

      {cartoes.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">Cadastre um cartão primeiro</div>}
    </AppShell>
  );
}
