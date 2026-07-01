import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

const URL = "https://controledasentregas.lovable.app/termos";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Entrega Pro" },
      {
        name: "description",
        content:
          "Termos de uso do Entrega Pro: responsabilidades, assinatura Premium, cancelamento e uso correto.",
      },
      { property: "og:title", content: "Termos de Uso — Entrega Pro" },
      {
        property: "og:description",
        content:
          "Regras de uso, Premium, assinatura, cancelamento e limitação de responsabilidade.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      subtitle="Ao usar o Entrega Pro, você concorda com estes termos."
      updatedAt="28 de junho de 2026"
    >
      <h2>1. Aceitação</h2>
      <p>
        Ao criar conta ou usar o Entrega Pro, você declara ter lido, entendido e
        aceito estes termos. Se não concordar, não use o app.
      </p>

      <h2>2. O que é o Entrega Pro</h2>
      <p>
        O Entrega Pro é uma ferramenta de gestão pessoal e financeira para
        motoristas de entrega. Ele registra dados que você mesmo insere e apresenta
        cálculos, gráficos e relatórios com base nesses dados.
      </p>

      <h2>3. Sua conta</h2>
      <ul>
        <li>Você é responsável por manter sua senha em sigilo.</li>
        <li>Não crie múltiplas contas para burlar limites do plano gratuito.</li>
        <li>Use apenas dados verdadeiros.</li>
      </ul>

      <h2>4. Plano Premium</h2>
      <ul>
        <li>
          <strong>Teste grátis:</strong> novas contas recebem 15 dias com todos os
          recursos Premium liberados.
        </li>
        <li>
          <strong>Assinatura mensal:</strong> R$ 3,90 por mês, renovação a cada 30 dias.
        </li>
        <li>
          <strong>Assinatura anual:</strong> R$ 24,90 por ano, renovação a cada 365 dias.
        </li>
        <li>
          <strong>Pagamento:</strong> feito por PIX para a chave indicada no app. A
          liberação ocorre após confirmação manual do pagamento pela equipe.
        </li>
        <li>
          <strong>Cancelamento:</strong> a assinatura não renova automaticamente. Se
          você não pagar o próximo período, a conta volta ao plano gratuito sem
          perder os dados.
        </li>
        <li>
          <strong>Reembolso:</strong> por se tratar de serviço digital de pequeno
          valor com teste gratuito prévio, não há reembolso após confirmação do PIX,
          exceto quando exigido por lei (art. 49 do CDC).
        </li>
      </ul>

      <h2>5. Uso correto</h2>
      <p>Você concorda em não:</p>
      <ul>
        <li>Fazer engenharia reversa, copiar ou revender o app.</li>
        <li>Usar o app para atividades ilegais.</li>
        <li>Tentar acessar contas ou dados de outros usuários.</li>
        <li>Abusar de brechas de segurança em vez de nos comunicar.</li>
      </ul>

      <h2>6. Nossos direitos</h2>
      <p>
        Podemos suspender ou encerrar contas que violem estes termos, sem aviso
        prévio quando houver risco a outros usuários ou à plataforma.
      </p>

      <h2>7. Propriedade intelectual</h2>
      <p>
        O código, marca, layout e conteúdo do app são de propriedade do Entrega Pro.
        Seus dados operacionais (lançamentos, valores, etc.) são seus.
      </p>

      <h2>8. Limitação de responsabilidade</h2>
      <p>
        O Entrega Pro é uma ferramenta de apoio à gestão. As decisões financeiras,
        fiscais e operacionais são de responsabilidade do usuário. Não nos
        responsabilizamos por lucros cessantes, decisões tomadas com base nos
        cálculos do app, indisponibilidade momentânea, perda de dados por uso
        indevido do próprio usuário, nem por conteúdo inserido pelo usuário.
      </p>

      <h2>9. Alterações</h2>
      <p>
        Podemos alterar estes termos. A versão vigente é sempre a exibida nesta
        página, com a data de "Última atualização" no topo.
      </p>

      <h2>10. Foro e legislação</h2>
      <p>
        Estes termos são regidos pelas leis do Brasil. Fica eleito o foro da comarca
        do domicílio do usuário para dirimir controvérsias.
      </p>

      <h2>11. Contato</h2>
      <p>
        <a href="mailto:suporte@entregapro.app">suporte@entregapro.app</a>
      </p>
    </LegalPage>
  );
}
