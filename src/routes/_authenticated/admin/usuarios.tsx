import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Calendar, Search, Users, LoaderCircle } from "lucide-react";
import { registrarLogAdmin } from "@/lib/admin-log";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UserRow = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  premium?: { plano: string; ativo: boolean; data_validade: string };
};

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Admin — Entrega Pro" },
      { name: "description", content: "Lista de motoristas cadastrados e situação da assinatura de cada um." },
      { property: "og:title", content: "Usuários — Admin — Entrega Pro" },
      { property: "og:description", content: "Lista de motoristas cadastrados e situação da assinatura de cada um." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/admin/usuarios" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/admin/usuarios" }],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");

  const load = useCallback(async () => {
    setError(null);
    const [{ data: profs, error: profilesError }, { data: prems, error: premiumError }] = await Promise.all([
      supabase.from("profiles").select("id, nome, email, telefone"),
      supabase.from("usuarios_premium").select("user_id, plano, ativo, data_validade"),
    ]);
    if (profilesError || premiumError || !profs) {
      setError("Não foi possível carregar os usuários.");
      setLoading(false);
      return;
    }
    const premMap = new Map((prems || []).map((p) => [p.user_id, p]));
    setUsers(profs.map((p) => {
      const premium = premMap.get(p.id);
      return {
        ...p,
        premium: premium ? {
          plano: premium.plano,
          ativo: premium.ativo,
          data_validade: premium.data_validade,
        } : undefined,
      };
    }) as UserRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function liberar(userId: string, plano: "mensal" | "anual") {
    setBusy(userId);
    const dias = plano === "anual" ? 365 : 30;
    const validade = new Date(Date.now() + dias * 86400000).toISOString();
    const { error } = await supabase.from("usuarios_premium").upsert({
      user_id: userId,
      plano,
      ativo: true,
      data_inicio: new Date().toISOString(),
      data_validade: validade,
    });
    if (error) { setBusy(null); return toast.error(error.message); }
    await registrarLogAdmin(plano === "anual" ? "renovacao_premium" : "liberacao_manual", { user_id: userId, plano, dias, validade });
    toast.success("Plano liberado");
    await load();
    setBusy(null);
  }

  async function alterarValidade() {
    if (!editingDate || !newDate) return;
    setBusy(editingDate);
    const { error } = await supabase.from("usuarios_premium").update({ data_validade: newDate, ativo: true }).eq("user_id", editingDate);
    if (error) return toast.error(error.message);
    await registrarLogAdmin("alteracao_validade", { user_id: editingDate, nova_validade: newDate });
    setEditingDate(null);
    await load();
    setBusy(null);
    toast.success("Validade atualizada");
  }

  async function desativar(userId: string) {
    setBusy(userId);
    const { error } = await supabase.from("usuarios_premium").update({ ativo: false }).eq("user_id", userId);
    if (error) { setBusy(null); return toast.error(error.message); }
    await registrarLogAdmin("liberacao_manual", { user_id: userId, acao: "desativar" });
    await load();
    setBusy(null);
    toast.success("Premium desativado");
  }

  const filtered = users.filter((u) => {
    const term = q.toLowerCase();
    return !term || u.nome?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term) || u.telefone?.includes(term);
  });

  return (
    <>
      <div className="ep-page-intro mb-4">
        <div className="ep-icon-chip"><Users className="size-4" /></div>
        <div><h2 className="font-semibold">Gestão de usuários</h2><p className="text-xs text-muted-foreground mt-0.5">Consulte cadastros e gerencie o acesso Premium.</p></div>
      </div>
      <label className="relative block mb-3">
        <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
        <input className="ep-input pl-10" placeholder="Buscar por nome, e-mail ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="text-xs text-muted-foreground mb-2">{filtered.length} {filtered.length === 1 ? "usuário" : "usuários"}</div>
      {loading && <div className="ep-empty"><LoaderCircle className="size-6 animate-spin text-primary" /><span className="mt-2 text-sm">Carregando usuários…</span></div>}
      {error && <div className="ep-empty"><span className="text-sm">{error}</span><Button className="mt-3" variant="secondary" onClick={() => { setLoading(true); void load(); }}>Tentar novamente</Button></div>}
      {!loading && !error && filtered.length === 0 && <div className="ep-empty text-sm">Nenhum usuário encontrado.</div>}
      <ul className="space-y-2">
        {filtered.map((u) => {
          const ativo = u.premium?.ativo && new Date(u.premium.data_validade).getTime() >= Date.now();
          return (
            <li key={u.id} className="ep-card">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{u.nome || "Sem nome"}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email || u.telefone || "—"}</div>
                </div>
                {ativo && <span className="ep-badge-premium"><Crown className="size-3" /> {u.premium?.plano}</span>}
              </div>
              {u.premium && (
                <div className="text-xs text-muted-foreground mt-2">
                  Validade: {new Date(u.premium.data_validade).toLocaleDateString("pt-BR")}
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button disabled={busy === u.id} onClick={() => liberar(u.id, "mensal")} variant="secondary" size="sm" className="text-primary">+ 30 dias</Button>
                <Button disabled={busy === u.id} onClick={() => liberar(u.id, "anual")} variant="secondary" size="sm" className="text-primary">+ 1 ano</Button>
                <Button disabled={busy === u.id} onClick={() => { setEditingDate(u.id); setNewDate(u.premium?.data_validade?.slice(0, 10) || new Date().toISOString().slice(0, 10)); }} variant="secondary" size="sm"><Calendar className="size-3" /> Alterar data</Button>
                <ConfirmAction trigger={<Button disabled={busy === u.id || !u.premium} variant="outline" size="sm" className="text-destructive">Desativar</Button>} title="Desativar Premium?" description={`O acesso Premium de ${u.nome || "este usuário"} será encerrado.`} confirmLabel="Desativar" destructive onConfirm={async () => { await desativar(u.id); }} />
              </div>
            </li>
          );
        })}
      </ul>
      <Dialog open={editingDate !== null} onOpenChange={(open) => !open && setEditingDate(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-xl bg-card p-5">
          <DialogHeader><DialogTitle>Alterar validade</DialogTitle><DialogDescription>Escolha a nova data final do acesso Premium.</DialogDescription></DialogHeader>
          <input type="date" className="ep-input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:space-x-0">
            <Button variant="outline" onClick={() => setEditingDate(null)}>Cancelar</Button>
            <Button disabled={!newDate || busy !== null} onClick={alterarValidade}>{busy ? "Salvando…" : "Salvar data"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
