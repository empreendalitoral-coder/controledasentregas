import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Calendar } from "lucide-react";

type UserRow = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  premium?: { plano: string; ativo: boolean; data_validade: string };
};

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Admin" }] }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const [{ data: profs }, { data: prems }] = await Promise.all([
      supabase.from("profiles").select("id, nome, email, telefone"),
      supabase.from("usuarios_premium").select("user_id, plano, ativo, data_validade"),
    ]);
    if (!profs) return;
    const premMap = new Map((prems || []).map((p) => [p.user_id, p]));
    setUsers(profs.map((p) => ({
      ...p,
      premium: premMap.get(p.id) ? {
        plano: premMap.get(p.id)!.plano,
        ativo: premMap.get(p.id)!.ativo,
        data_validade: premMap.get(p.id)!.data_validade,
      } : undefined,
    })) as UserRow[]);
  }
  useEffect(() => { load(); }, []);

  async function liberar(userId: string, plano: "mensal" | "anual") {
    const dias = plano === "anual" ? 365 : 30;
    const validade = new Date(Date.now() + dias * 86400000).toISOString();
    const { error } = await supabase.from("usuarios_premium").upsert({
      user_id: userId,
      plano,
      ativo: true,
      data_inicio: new Date().toISOString(),
      data_validade: validade,
    });
    if (error) return toast.error(error.message);
    toast.success("Plano liberado");
    load();
  }

  async function alterarValidade(userId: string) {
    const d = prompt("Nova data de validade (AAAA-MM-DD):");
    if (!d) return;
    const { error } = await supabase.from("usuarios_premium").update({ data_validade: d, ativo: true }).eq("user_id", userId);
    if (error) return toast.error(error.message);
    load();
  }

  async function desativar(userId: string) {
    if (!confirm("Desativar Premium deste usuário?")) return;
    await supabase.from("usuarios_premium").update({ ativo: false }).eq("user_id", userId);
    load();
  }

  const filtered = users.filter((u) => {
    const term = q.toLowerCase();
    return !term || u.nome?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term) || u.telefone?.includes(term);
  });

  return (
    <>
      <input className="ep-input mb-3" placeholder="Buscar por nome, e-mail ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="text-xs text-muted-foreground mb-2">{filtered.length} usuários</div>
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
                <button onClick={() => liberar(u.id, "mensal")} className="h-9 rounded-md bg-primary/20 text-primary text-xs font-semibold">+ 30 dias</button>
                <button onClick={() => liberar(u.id, "anual")} className="h-9 rounded-md bg-primary/20 text-primary text-xs font-semibold">+ 1 ano</button>
                <button onClick={() => alterarValidade(u.id)} className="h-9 rounded-md bg-secondary text-xs font-medium flex items-center justify-center gap-1"><Calendar className="size-3" /> Alterar data</button>
                <button onClick={() => desativar(u.id)} className="h-9 rounded-md bg-destructive/20 text-destructive text-xs font-semibold">Desativar</button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
