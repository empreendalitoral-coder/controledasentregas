import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

const URL = "https://controledasentregas.lovable.app/privacidade";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Entrega Pro" },
      {
        name: "description",
        content:
          "Como o Entrega Pro coleta, usa, armazena e protege seus dados. Conforme LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade — Entrega Pro" },
      {
        property: "og:description",
        content: "Como o Entrega Pro coleta, usa e protege seus dados. Conforme LGPD.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      subtitle="Entrega Pro respeita sua privacidade e cumpre a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)."
      updatedAt="28 de junho de 2026"
    >
      <h2>1. Quem somos</h2>
      <p>
        Entrega Pro é um aplicativo de gestão profissional para motoristas de entrega,
        que ajuda a controlar entregas, combustível, recebimentos e lucro real. Esta
        política descreve como tratamos seus dados pessoais.
      </p>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Cadastro:</strong> nome, e-mail e/ou telefone e senha (armazenada de
          forma criptografada, nunca em texto puro).
        </li>
        <li>
          <strong>Perfil opcional:</strong> foto, transportadora, veículo, modelo,
          placa, cidade e meta mensal.
        </li>
        <li>
          <strong>Operacionais:</strong> lançamentos de entregas (data, pacotes, KM,
          combustível, valores), recebimentos, PIX, contas fixas, cartões, manutenções
          e metas — sempre inseridos por você.
        </li>
        <li>
          <strong>Comprovantes de pagamento:</strong> quando você envia o comprovante
          do plano Premium, o arquivo fica em armazenamento privado, acessível apenas
          por você e pela equipe administrativa.
        </li>
        <li>
          <strong>Técnicos:</strong> registros de erro e uso mínimo para manter o app
          estável. Não usamos publicidade nem rastreamento de terceiros.
        </li>
      </ul>

      <h2>3. Como usamos seus dados</h2>
      <ul>
        <li>Fornecer os cálculos e relatórios do próprio app.</li>
        <li>Autenticar seu acesso e proteger sua conta.</li>
        <li>Ativar, renovar ou cancelar seu plano Premium.</li>
        <li>Melhorar estabilidade e corrigir erros.</li>
      </ul>
      <p>
        Não vendemos, não alugamos e não compartilhamos seus dados com terceiros para
        fins comerciais.
      </p>

      <h2>4. Onde ficam armazenados</h2>
      <p>
        Seus dados ficam em infraestrutura profissional na nuvem (Supabase / Cloudflare),
        criptografados em trânsito (HTTPS) e em repouso. O acesso administrativo é
        restrito e auditado por logs.
      </p>

      <h2>5. Base legal (LGPD)</h2>
      <ul>
        <li><strong>Execução de contrato:</strong> para prestar o serviço que você contratou.</li>
        <li><strong>Consentimento:</strong> para dados opcionais como foto de perfil.</li>
        <li><strong>Legítimo interesse:</strong> para segurança e prevenção a fraude.</li>
        <li><strong>Obrigação legal/fiscal:</strong> quando aplicável a pagamentos.</li>
      </ul>

      <h2>6. Seus direitos</h2>
      <p>Você pode, a qualquer momento:</p>
      <ul>
        <li>Acessar, corrigir ou atualizar seus dados pelo próprio app.</li>
        <li>Exportar seus dados em formato JSON pelo menu "Mais &gt; Backup".</li>
        <li>
          Solicitar a exclusão da sua conta em "Perfil &gt; Zona de perigo".
          A conta é bloqueada imediatamente e apagada em definitivo em até 30 dias.
        </li>
        <li>Revogar seu consentimento e encerrar o uso do app.</li>
      </ul>

      <h2>7. Retenção</h2>
      <p>
        Mantemos seus dados enquanto sua conta estiver ativa. Após a solicitação de
        exclusão, os dados são apagados em até 30 dias, exceto quando houver obrigação
        legal de guarda (ex.: registros fiscais).
      </p>

      <h2>8. Menores de idade</h2>
      <p>
        O Entrega Pro não é destinado a menores de 18 anos. Se soubermos que criamos
        conta para menor, ela será removida.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Usamos armazenamento local do navegador apenas para manter sua sessão e
        preferências. Não usamos cookies de rastreamento publicitário.
      </p>

      <h2>10. Alterações desta política</h2>
      <p>
        Podemos atualizar esta política. A data de "Última atualização" no topo indica
        a vigência. Alterações relevantes serão comunicadas dentro do app.
      </p>

      <h2>11. Contato / Encarregado (DPO)</h2>
      <p>
        Dúvidas, solicitações LGPD ou incidentes: <a href="mailto:suporte@entregapro.app">suporte@entregapro.app</a>.
      </p>
    </LegalPage>
  );
}
