import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

const URL = "https://controledasentregas.lovable.app/sobre";
const VERSAO = "1.0.0";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Entrega Pro" },
      {
        name: "description",
        content: `Sobre o Entrega Pro, versão ${VERSAO}. App para motoristas de entrega.`,
      },
      { property: "og:title", content: "Sobre — Entrega Pro" },
      { property: "og:description", content: "Sobre, versão e licenças do Entrega Pro." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <LegalPage
      title="Sobre o Entrega Pro"
      subtitle='"Saiba exatamente quanto trabalhou, quanto gastou e quanto vai receber."'
    >
      <h2>Versão</h2>
      <p>{VERSAO}</p>

      <h2>O que faz</h2>
      <ul>
        <li>Registra suas entregas, KM, combustível, PNR e pacotes perdidos.</li>
        <li>Calcula lucro bruto, líquido e lucro real (descontando manutenção).</li>
        <li>Controla recebimentos futuros e datas de pagamento.</li>
        <li>Central Financeira Premium: contas fixas, cartões, PIX, fluxo de caixa, metas e relatório MEI.</li>
        <li>Gráficos de evolução: 7 dias, 30 dias, 6 meses, 12 meses.</li>
        <li>Backup em JSON e relatório em PDF.</li>
      </ul>

      <h2>Tecnologias</h2>
      <p>
        React, TanStack Start, TypeScript, Tailwind CSS, Supabase (banco e
        autenticação), Lovable Cloud e Cloudflare.
      </p>

      <h2>Licenças de terceiros</h2>
      <p>
        O Entrega Pro utiliza software livre. Principais dependências:
      </p>
      <ul>
        <li>React (MIT) — Meta Platforms</li>
        <li>TanStack Router / Query / React Start (MIT)</li>
        <li>Tailwind CSS (MIT)</li>
        <li>shadcn/ui (MIT)</li>
        <li>Lucide Icons (ISC)</li>
        <li>Supabase JS (MIT)</li>
        <li>Sonner (MIT)</li>
        <li>Recharts (MIT)</li>
        <li>Zod (MIT)</li>
      </ul>

      <h2>Links</h2>
      <ul>
        <li><Link to="/privacidade">Política de Privacidade</Link></li>
        <li><Link to="/termos">Termos de Uso</Link></li>
        <li><Link to="/suporte">Suporte</Link></li>
      </ul>

      <h2>Contato</h2>
      <p>
        <a href="mailto:suporte@entregapro.app">suporte@entregapro.app</a>
      </p>
    </LegalPage>
  );
}
