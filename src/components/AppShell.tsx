import { Link, useRouterState } from "@tanstack/react-router";
import { AvisosBanner } from "@/components/AvisosBanner";
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
import { Button } from "@/components/ui/button";

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
        p.startsWith("/comunidade") ||
        p.startsWith("/abastecimentos") ||
        p.startsWith("/manutencao") ||
        p.startsWith("/backup"),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {title && (
        <header className="sticky top-0 z-30 backdrop-blur bg-background/90 border-b border-border">
          <div className="mx-auto max-w-2xl flex items-center gap-3 px-4 h-14">
            {back ? (
              <Link
                to={back}
                className="size-9 grid place-items-center rounded-md text-foreground/90 hover:text-primary -ml-2"
                aria-label="Voltar"
              >
                <ArrowLeft className="size-5" />
              </Link>
            ) : <div className="w-7" aria-hidden="true" />}
            <h1 className="text-base font-semibold flex-1 text-center">{title}</h1>
            <div className="w-9 flex justify-end items-center">
              {right ?? (
                <Button asChild variant="ghost" size="icon" className="size-9" aria-label="Notificações">
                  <Link to="/perfil/notificacoes">
                    <Bell className="size-5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 pt-4 pb-28">
        <AvisosBanner />
        {children}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <Link to="/privacidade" className="hover:text-primary">Privacidade</Link>
          <span>·</span>
          <Link to="/termos" className="hover:text-primary">Termos</Link>
          <span>·</span>
          <Link to="/sobre" className="hover:text-primary">Sobre</Link>
          <span>·</span>
          <Link to="/suporte" className="hover:text-primary">Suporte</Link>
        </div>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur" aria-label="Navegação principal">
        <div className="mx-auto max-w-2xl grid grid-cols-5">
          {tabs.map((t) => {
            const active = t.match(pathname);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
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
