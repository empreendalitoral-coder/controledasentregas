import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

const URL = "https://meuentregapro.app/suporte";

export const Route = createFileRoute("/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte — Entrega Pro" },
      {
        name: "description",
        content: "Central de ajuda do Entrega Pro. Contato e perguntas frequentes.",
      },
      { property: "og:title", content: "Suporte — Entrega Pro" },
      { property: "og:description", content: "Central de ajuda do Entrega Pro: contato, dúvidas frequentes e suporte ao motorista." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: SuportePage,
});

function SuportePage() {
  return (
    <LegalPage
      title="Suporte"
      subtitle="A gente lê e responde toda mensagem enviada."
    >
      <h2>Fale com a gente</h2>
      <ul>
        <li>
          E-mail: <a href="mailto:suporte@entregapro.app">suporte@entregapro.app</a>
        </li>
      </ul>
      <p>
        Tempo médio de resposta: até 48h em dias úteis.
      </p>

      <h2>Perguntas frequentes</h2>

      <h3>Como funciona o teste grátis?</h3>
      <p>
        Ao criar sua conta você recebe 15 dias com todos os recursos Premium
        liberados. Depois, você escolhe se quer continuar no plano gratuito ou
        assinar Premium.
      </p>

      <h3>Como assino o Premium?</h3>
      <p>
        No menu "Mais &gt; Premium" você vê a chave PIX. Após pagar, envia o
        comprovante pelo app. A liberação é feita em até algumas horas após a
        confirmação.
      </p>

      <h3>Como excluo minha conta?</h3>
      <p>
        Vá em "Perfil &gt; Zona de perigo &gt; Excluir minha conta". Sua conta é
        bloqueada na hora e todos os seus dados são apagados em definitivo em até
        30 dias. Você pode cancelar a exclusão dentro desse prazo.
      </p>

      <h3>Perdi meus dados, tem backup?</h3>
      <p>
        Seus dados ficam salvos na nuvem. Você também pode exportar um backup em
        JSON pelo menu "Mais &gt; Backup" a qualquer momento e importar depois.
      </p>

      <h3>Esqueci minha senha</h3>
      <p>
        Na tela de login, clique em "Esqueci minha senha" e siga as instruções que
        chegam no seu e-mail.
      </p>

      <h3>Não recebi meu Premium após pagar</h3>
      <p>
        Envie o comprovante pelo e-mail acima com o e-mail cadastrado e o dia/hora
        do PIX. Reforçamos manualmente a liberação.
      </p>
    </LegalPage>
  );
}
