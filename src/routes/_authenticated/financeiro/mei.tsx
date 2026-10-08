import { createFileRoute } from "@tanstack/react-router";
import { FiscalReport } from "@/components/FiscalReport";
import { fiscalQuery } from "@/lib/fiscal-data";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/financeiro/mei")({
  head: () => ({
    meta: [
      { title: "CNPJ e CPF — Relatório MEI | Entrega Pro" },
      { name: "description", content: "Receitas e despesas separadas entre empresa e pessoa física, com relatórios mensais e anuais para organização do MEI." },
      { property: "og:title", content: "CNPJ e CPF — Relatório MEI | Entrega Pro" },
      { property: "og:description", content: "Organize receitas e despesas do CNPJ e CPF e exporte relatórios separados por período." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fiscalQuery(new Date().getFullYear())),
  component: FiscalReport,
  pendingComponent: () => <AppShell title="CNPJ e CPF" back="/financeiro"><p className="py-10 text-center text-muted-foreground">Carregando registros…</p></AppShell>,
  errorComponent: ({ reset }) => <AppShell title="CNPJ e CPF" back="/financeiro"><div className="py-8 space-y-4"><p>Não foi possível carregar todos os registros. Nenhum total parcial foi apresentado.</p><Button onClick={reset}>Tentar novamente</Button></div></AppShell>,
});
