import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Home,
  ListChecks,
  Wallet,
  BarChart3,
  Menu as MenuIcon,
  Bell,
  ArrowLeft,
} from "lucide-react";

type Props = {
  title?: string;
  children: ReactNode;
  back?: string;
  right?: ReactNode;
};

export function AppShell({ title, children, back, right }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/", label: "Início", icon: Home, match: (p: string) => p === "/" },
    {
      to: "/historico",
      label: "Histórico",
      icon: ListChecks,
      match: (p: string) => p.startsWith("/historico") || p.startsWith("/lancamento"),
    },
    {
      to: "/recebimentos",
      label: "Receb.",
      icon: Wallet,
      match: (p: string) => p.startsWith("/recebimentos"),
    },
    {
      to: "/graficos",
      label: "Gráficos",
      icon: BarChart3,
      match: (p: string) => p.startsWith("/graficos") || p.startsWith("/resumo"),
    },
    {
      to: "/mais",
      label: "Mais",
      icon: MenuIcon,
      match: (p: string) =>
        p.startsWith("/mais") ||
        p.startsWith("/perfil") ||
        p.startsWith("/abastecimentos") ||
        p.startsWith("/manutencao") ||
        p.startsWith("/backup"),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {title && (
        <header className="sticky top-0 z-30 backdrop-blur bg-background/85 border-b border-border">
          <div className="mx-auto max-w-2xl flex items-center gap-3 px-4 h-14">
            {back ? (
              <Link
                to={back}
                className="text-foreground/90 hover:text-primary transition px-2 -ml-2"
                aria-label="Voltar"
              >
                ←
              </Link>
            ) : null}
            <h1 className="text-base font-semibold flex-1 text-center">{title}</h1>
            <div className="w-8 flex justify-end">{right}</div>
          </div>
        </header>
      )}

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 pt-4 pb-28">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-2xl grid grid-cols-5">
          {tabs.map((t) => {
            const active = t.match(pathname);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
