import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { usePremium } from "@/lib/premium";
import { Crown, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinanceiroLayout,
});

function FinanceiroLayout() {
  const premium = usePremium();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (premium.loading) {
    return <AppShell title="Central Financeira"><div className="text-center text-muted-foreground py-10">Carregando...</div></AppShell>;
  }

  if (!premium.ativo) {
    return (
      <AppShell title="Central Financeira" back="/mais">
        <div className="ep-card text-center bg-gradient-to-br from-primary/15 via-card to-card border-primary/40">
          <Lock className="size-12 text-primary mx-auto" />
          <h2 className="mt-3 text-xl font-bold">Recurso Premium</h2>
          <p className="text-sm text-muted-foreground mt-1">
            A Central Financeira está disponível apenas para assinantes Premium.
          </p>
          <Link to="/premium" className="mt-4 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-primary text-primary-foreground font-semibold">
            <Crown className="size-4" /> Assinar Premium
          </Link>
        </div>
      </AppShell>
    );
  }

  if (pathname === "/financeiro" || pathname === "/financeiro/") {
    return <FinanceiroIndex />;
  }

  return <Outlet />;
}

function FinanceiroIndex() {
  const items = [
    { to: "/financeiro/contas", label: "Contas Fixas", desc: "Água, luz, aluguel, etc.", emoji: "📄" },
    { to: "/financeiro/cartoes", label: "Cartões de Crédito", desc: "Limites e parcelas", emoji: "💳" },
    { to: "/financeiro/fluxo", label: "Fluxo de Caixa", desc: "Entradas e saídas do dia", emoji: "📊" },
    { to: "/financeiro/metas", label: "Metas Financeiras", desc: "Sua próxima conquista", emoji: "🎯" },
    { to: "/financeiro/pix", label: "PIX Recebidos & Enviados", desc: "Controle dos seus PIX", emoji: "⚡" },
    { to: "/financeiro/quinzena", label: "Fechamento por Quinzena", desc: "1ª e 2ª quinzena com PDF", emoji: "📅" },
    { to: "/financeiro/mei", label: "Relatório MEI", desc: "Mensal e anual", emoji: "📈" },
  ] as const;
  return (
    <AppShell title="Central Financeira" back="/mais">
      <div className="ep-card flex items-center gap-3 bg-gradient-to-br from-primary/10 via-card to-card border-primary/40">
        <Crown className="size-6 text-primary" />
        <div className="flex-1">
          <div className="font-semibold">Plano Premium ativo</div>
          <div className="text-xs text-muted-foreground">Tudo desbloqueado para você</div>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {items.map((it) => (
          <Link key={it.to} to={it.to} className="ep-card flex items-center gap-3 hover:border-primary/40 transition">
            <div className="size-12 rounded-lg bg-secondary grid place-items-center text-2xl">{it.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{it.label}</div>
              <div className="text-xs text-muted-foreground">{it.desc}</div>
            </div>
            <span className="text-muted-foreground">›</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
