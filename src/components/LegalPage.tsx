import { Link } from "@tanstack/react-router";
import { ArrowLeft, Truck } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  updatedAt?: string;
  children: ReactNode;
};

/** Layout para páginas públicas legais (Privacidade, Termos, Sobre, Suporte). */
export function LegalPage({ title, subtitle, updatedAt, children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/90 border-b border-border">
        <div className="mx-auto max-w-3xl flex items-center gap-3 px-4 h-14">
          <Link
            to="/"
            className="size-9 grid place-items-center rounded-md text-foreground/90 hover:text-primary -ml-2"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Truck className="size-5 text-primary" />
            <span className="font-semibold">Entrega Pro</span>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        {updatedAt && (
          <p className="mt-2 text-xs text-muted-foreground">Última atualização: {updatedAt}</p>
        )}
        <article className="prose prose-invert prose-sm sm:prose-base max-w-none mt-6 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_li]:text-sm [&_li]:text-muted-foreground [&_li]:mb-1 [&_a]:text-primary [&_a]:underline">
          {children}
        </article>
      </main>

      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="border-t border-border py-6 mt-8">
      <div className="mx-auto max-w-3xl px-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <Link to="/privacidade" className="hover:text-primary">Privacidade</Link>
        <span>·</span>
        <Link to="/termos" className="hover:text-primary">Termos</Link>
        <span>·</span>
        <Link to="/sobre" className="hover:text-primary">Sobre</Link>
        <span>·</span>
        <Link to="/suporte" className="hover:text-primary">Suporte</Link>
        <span>·</span>
        <span>© {new Date().getFullYear()} Entrega Pro</span>
      </div>
    </footer>
  );
}
