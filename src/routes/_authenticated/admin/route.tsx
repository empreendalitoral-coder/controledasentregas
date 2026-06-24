import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileCheck, Settings, BarChart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname === "/admin" || pathname === "/admin/") return <AdminIndex />;

  const tabs = [
    { to: "/admin", label: "Visão geral", icon: BarChart },
    { to: "/admin/solicitacoes", label: "Solicitações", icon: FileCheck },
    { to: "/admin/usuarios", label: "Usuários", icon: Users },
    { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
  ];
  return (
    <AppShell title="Admin" back="/mais">
      <div className="ep-card flex gap-1 p-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = pathname === t.to;
          const Icon = t.icon;
          return (
            <Link key={t.to} to={t.to} className={`flex-1 min-w-fit h-10 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
              <Icon className="size-3.5" /> {t.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-4"><Outlet /></div>
    </AppShell>
  );
}

import { useEffect, useState } from "react";

function AdminIndex() {
  const [stats, setStats] = useState({ usuarios: 0, premium: 0, pendentes: 0, teste: 0 });

  useEffect(() => {
    (async () => {
      const [u, p, s, t] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("usuarios_premium").select("user_id", { count: "exact", head: true }).in("plano", ["mensal", "anual"]).gte("data_validade", new Date().toISOString()),
        supabase.from("solicitacoes_premium").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("usuarios_premium").select("user_id", { count: "exact", head: true }).eq("plano", "teste").gte("data_validade", new Date().toISOString()),
      ]);
      setStats({ usuarios: u.count || 0, premium: p.count || 0, pendentes: s.count || 0, teste: t.count || 0 });
    })();
  }, []);

  return (
    <AppShell title="Painel Admin" back="/mais">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total de usuários" value={stats.usuarios} icon={<Users className="size-5 text-primary" />} />
        <StatCard label="Assinantes Premium" value={stats.premium} icon={<BarChart className="size-5 text-success" />} />
        <StatCard label="Em teste grátis" value={stats.teste} icon={<BarChart className="size-5 text-warning" />} />
        <StatCard label="Pedidos pendentes" value={stats.pendentes} icon={<FileCheck className="size-5 text-destructive" />} />
      </div>

      <div className="mt-4 grid gap-2">
        <Link to="/admin/solicitacoes" className="ep-card flex items-center gap-3">
          <FileCheck className="size-5 text-primary" />
          <div className="flex-1"><div className="font-semibold">Solicitações PIX</div><div className="text-xs text-muted-foreground">Aprovar ou recusar pagamentos</div></div>
          <span className="text-muted-foreground">›</span>
        </Link>
        <Link to="/admin/usuarios" className="ep-card flex items-center gap-3">
          <Users className="size-5 text-primary" />
          <div className="flex-1"><div className="font-semibold">Usuários</div><div className="text-xs text-muted-foreground">Gerenciar planos manualmente</div></div>
          <span className="text-muted-foreground">›</span>
        </Link>
        <Link to="/admin/configuracoes" className="ep-card flex items-center gap-3">
          <Settings className="size-5 text-primary" />
          <div className="flex-1"><div className="font-semibold">Configurações</div><div className="text-xs text-muted-foreground">Chave PIX, valores, mensagens</div></div>
          <span className="text-muted-foreground">›</span>
        </Link>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="ep-card">
      <div className="flex items-center justify-between">
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
