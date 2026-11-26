import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BRL } from "@/lib/calc";
import { referralSearch } from "@/lib/referrals";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck, Fuel, Wrench, Building2, ScanLine, Camera, MessagesSquare, Target, ShieldCheck, Gift, FileText, Check,
} from "lucide-react";

const URL = "https://meuentregapro.app/conheca";
const TITLE = "Meu Entrega Pro — controle financeiro para entregadores";
const DESC = "Conheça tudo o que o Meu Entrega Pro faz pelo entregador de Mercado Livre e Shopee: lançamentos, quinzenas, combustível, MEI, recibos, Feed e chat. 3 dias grátis.";

export const Route = createFileRoute("/conheca")({
  validateSearch: referralSearch,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: "Meu Entrega Pro — saiba quanto sobra das suas entregas" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: Conheca,
});

import inicioImg from "@/assets/conheca/inicio.webp.asset.json";
import historicoImg from "@/assets/conheca/historico.webp.asset.json";
import recebImg from "@/assets/conheca/receb.webp.asset.json";
import resumoImg from "@/assets/conheca/resumo.webp.asset.json";
import abastImg from "@/assets/conheca/abast.webp.asset.json";
import feedImg from "@/assets/conheca/feed.webp.asset.json";
import finImg from "@/assets/conheca/fin.webp.asset.json";

const TELAS = [
  { img: inicioImg.url, tag: "Tela inicial", t: "Seu lucro do mês logo de cara", d: "Ao abrir o app você vê quanto já ganhou no mês e quanto falta para sua meta. Se ainda não lançou o dia, o botão amarelo avisa.", pts: ["Lucro líquido do mês", "Barra da meta mensal", "Lançar o dia com um toque"] },
  { img: historicoImg.url, tag: "Histórico", t: "Cada dia de rota anotado", d: "Todo dia trabalhado fica salvo com cidade, pacotes, KM e valor. A porcentagem de entrega mostra como foi sua rota.", pts: ["Taxa de entrega de cada dia", "Filtro por hoje, semana e mês", "Valor líquido por dia"] },
  { img: recebImg.url, tag: "Recebimentos", t: "Confira se a quinzena caiu certa", d: "O app soma as diárias do período e mostra quanto você tem a receber. Quando o pagamento cair, é só marcar como recebido.", pts: ["Quanto falta receber", "Quanto já caiu na conta", "Data prevista de pagamento"] },
  { img: resumoImg.url, tag: "Resumo do mês", t: "O mês inteiro em uma tela", d: "Pacotes entregues, KM rodados, horas trabalhadas e lucro real depois do combustível e da manutenção.", pts: ["Lucro real do mês", "Pacotes e KM rodados", "Compartilhar o mês no WhatsApp"] },
  { img: abastImg.url, tag: "Combustível", t: "Quanto a gasolina leva do seu ganho", d: "Registre cada abastecimento e veja litros, preço por litro e o total gasto no mês.", pts: ["Total gasto no mês", "Preço por litro", "Posto e KM de cada tanque"] },
  { img: finImg.url, tag: "Central financeira", t: "Contas, cartões, Pix e MEI", d: "Organize contas fixas, cartões, Pix e metas. O relatório separa o que é do CNPJ (MEI) e o que é pessoal no CPF.", pts: ["Contas fixas e cartões", "Fechamento por quinzena em PDF", "Separação CNPJ e CPF"] },
  { img: feedImg.url, tag: "Feed e bate-papo", t: "Comunidade de entregadores", d: "Ganhe selos de 100, 500 e 1.000 entregas, poste fotos do seu dia e converse com motoristas da sua região.", pts: ["Selos de conquista", "Fotos do dia a dia", "Bate-papo por estado"] },
];

const num = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);

const RECURSOS = [
  { icon: CalendarCheck, t: "Lançamento do dia", d: "Pacotes, insucessos, KM e diária. A taxa de entrega aparece na hora e fica no histórico." },
  { icon: FileText, t: "Conferência de quinzenas", d: "Veja se o valor que caiu na conta bate com as diárias que você trabalhou." },
  { icon: Fuel, t: "Abastecimentos", d: "Cada tanque registrado e quanto o combustível pesa no seu mês." },
  { icon: Wrench, t: "Manutenção e multas", d: "Óleo, pneus, revisões e multas anotados, sem esquecer nada." },
  { icon: Building2, t: "Separação CNPJ (MEI) e CPF", d: "Relatório que separa o que é do trabalho e o que é pessoal, em PDF e planilha." },
  { icon: ScanLine, t: "Leitor de notas e recibos", d: "Fotografe o recibo: o app lê, organiza a despesa e você só confere." },
  { icon: Target, t: "Central financeira e metas", d: "Contas fixas, cartões, Pix, fluxo de caixa e metas de economia." },
  { icon: Camera, t: "Feed da Estrada", d: "Poste fotos do seu dia e ganhe selos de 100, 500 e 1.000 entregas." },
  { icon: MessagesSquare, t: "Bate-papo por estado", d: "Salas da sua região para trocar dicas de rota e base, com moderação." },
  { icon: Gift, t: "Indique e ganhe", d: "5% da primeira assinatura de quem você indicar, por Pix ou desconto." },
  { icon: ShieldCheck, t: "Backup dos seus dados", d: "Exporte e restaure seus registros se trocar de celular." },
];

function Conheca() {
  const search = Route.useSearch();
  const [rec, setRec] = useState("300");
  const [gas, setGas] = useState("90");
  const r = num(rec), sobra = r - num(gas);
  const pct = r > 0 ? (sobra / r) * 100 : 0;

  const Cta = ({ children }: { children: string }) => (
    <Button asChild size="lg" className="w-full sm:w-auto"><Link to="/auth" search={search}>{children}</Link></Button>
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <span className="font-extrabold">Meu <span className="text-primary">Entrega Pro</span></span>
        <Link to="/auth" search={search} className="text-sm text-muted-foreground underline">Já tenho conta</Link>
      </header>

      <section className="mx-auto max-w-xl px-5 pb-12 pt-6 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Para entregadores de Mercado Livre e Shopee</p>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">Seu dinheiro das entregas organizado em um só app</h1>
        <p className="mt-4 text-muted-foreground">Lance o dia em segundos e saiba quanto realmente sobra depois do combustível, manutenção e despesas.</p>
        <div className="mt-6"><Cta>Testar 3 dias grátis</Cta></div>
        <p className="mt-2 text-xs text-muted-foreground">Sem cartão de crédito</p>
      </section>

      <section className="mx-auto max-w-xl px-5 pb-12">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Faça a conta rápida</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[["Recebi hoje", rec, setRec], ["Gastei hoje", gas, setGas]].map(([l, v, s]) => (
              <label key={l as string} className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">{l as string}</span>
                <input type="number" inputMode="decimal" min="0" value={v as string}
                  onChange={(e) => (s as (x: string) => void)(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-3 text-lg outline-none focus:border-primary" />
              </label>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Sobrou</p>
          <p className="text-3xl font-extrabold text-primary">{BRL(sobra)}</p>
          <p className="text-sm text-muted-foreground">{pct.toFixed(0)}% do que você recebeu. No app, isso é calculado todo dia, semana e mês.</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-12">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary">Por dentro do app</p>
        <h2 className="mt-2 text-center text-2xl font-bold sm:text-3xl">Veja as telas reais do Meu Entrega Pro</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Fotos do aplicativo com valores de exemplo.</p>
        <div className="mt-10 space-y-14">
          {TELAS.map((x, i) => (
            <article key={x.tag} className={`flex flex-col items-center gap-6 sm:gap-10 ${i % 2 ? "sm:flex-row-reverse" : "sm:flex-row"}`}>
              <div className="w-[230px] shrink-0 rounded-[2.2rem] border-[6px] border-secondary bg-secondary p-1 shadow-2xl shadow-primary/10">
                <img src={x.img} alt={`Tela ${x.tag} do Meu Entrega Pro`} loading="lazy" width={585} height={1266} className="block w-full rounded-[1.8rem]" />
              </div>
              <div className="max-w-md">
                <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{i + 1}. {x.tag}</span>
                <h3 className="mt-3 text-xl font-bold">{x.t}</h3>
                <p className="mt-2 text-muted-foreground">{x.d}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {x.pts.map((pt) => <li key={pt} className="flex gap-2"><Check className="size-4 shrink-0 text-primary" />{pt}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-12 text-center"><Cta>Quero testar 3 dias grátis</Cta></div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-12">
        <h2 className="text-center text-2xl font-bold">E ainda tem mais</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {RECURSOS.filter((r) => ["Manutenção e multas", "Leitor de notas e recibos", "Indique e ganhe", "Backup dos seus dados"].includes(r.t)).map(({ icon: I, t, d }) => (
            <div key={t} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <I className="mt-0.5 size-5 shrink-0 text-primary" />
              <div><p className="font-semibold">{t}</p><p className="text-sm text-muted-foreground">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-xl px-5 pb-16">
        <div className="rounded-2xl border border-primary/50 bg-card p-6 text-center">
          <h2 className="text-2xl font-bold">Comece a controlar seus ganhos hoje</h2>
          <ul className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm">
            {["3 dias de Premium grátis", "R$ 9,90/mês ou R$ 69,90/ano depois, se quiser", "Funciona no celular, direto do navegador"].map((x) => (
              <li key={x} className="flex gap-2"><Check className="size-4 shrink-0 text-primary" />{x}</li>
            ))}
          </ul>
          <div className="mt-5"><Cta>Criar minha conta grátis</Cta></div>
          <p className="mt-3 text-xs text-muted-foreground">
            <Link to="/termos" className="underline">Termos</Link> · <Link to="/privacidade" className="underline">Privacidade</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
