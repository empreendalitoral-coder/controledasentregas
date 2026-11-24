import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BRL } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck, Fuel, Wrench, Building2, ScanLine, Camera, MessagesSquare, Target, ShieldCheck, Gift, Percent, FileText,
} from "lucide-react";

const URL = "https://meuentregapro.app/calculadora";
const TITLE = "Quanto sobra das suas entregas? Calculadora grátis — Entrega Pro";
const DESC = "Entregador de Mercado Livre e Shopee: descubra em segundos quanto sobra do dia depois do combustível e dos gastos. Sem cadastro.";

export const Route = createFileRoute("/calculadora")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: "Você sabe quanto realmente sobra das suas entregas?" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: Landing,
});

const num = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);

const RECURSOS = [
  { icon: CalendarCheck, t: "Lançamento do dia", d: "Pacotes, insucessos, KM e diária. Mostra sua taxa de entrega na hora." },
  { icon: FileText, t: "Recebimentos e quinzenas", d: "Confira se o que caiu na conta bate com as diárias trabalhadas." },
  { icon: Fuel, t: "Abastecimentos", d: "Registre cada abastecimento e veja quanto o combustível pesa no mês." },
  { icon: Wrench, t: "Manutenção e multas", d: "Troca de óleo, pneus e multas anotados, sem esquecer nada." },
  { icon: Building2, t: "Separação CNPJ e CPF", d: "Relatório MEI separa o que é do trabalho e o que é pessoal, em PDF e planilha." },
  { icon: ScanLine, t: "Leitor de notas e recibos", d: "Tire foto do recibo e o app lê e organiza a despesa para você revisar." },
  { icon: Target, t: "Metas e fluxo de caixa", d: "Contas fixas, cartões, Pix e metas financeiras em um só lugar." },
  { icon: Camera, t: "Feed da Estrada", d: "Poste fotos do seu dia e ganhe selos de 100, 500 e 1.000 entregas." },
  { icon: MessagesSquare, t: "Bate-papo por estado", d: "Converse com entregadores da sua região, com moderação." },
  { icon: Gift, t: "Indique e ganhe", d: "5% da primeira assinatura de quem você indicar." },
  { icon: ShieldCheck, t: "Backup dos seus dados", d: "Exporte e restaure seus registros quando quiser." },
];

function Landing() {
  const [rec, setRec] = useState("300");
  const [comb, setComb] = useState("70");
  const [out, setOut] = useState("20");
  const [calc, setCalc] = useState(false);
  const r = num(rec), g = num(comb) + num(out), sobra = r - g;
  const pct = r > 0 ? (sobra / r) * 100 : 0;
  const tom = pct >= 55 ? "text-success" : pct >= 35 ? "text-primary" : "text-destructive";

  const campo = (l: string, v: string, s: (x: string) => void) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{l}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 focus-within:border-primary">
        <span className="text-sm text-muted-foreground">R$</span>
        <input type="number" inputMode="decimal" min="0" value={v} onChange={(e) => { s(e.target.value); setCalc(false); }} className="w-full bg-transparent text-lg outline-none" />
      </div>
    </label>
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-xl px-5 pb-10 pt-12 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Para entregadores de Mercado Livre e Shopee</p>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">Você trabalha o dia inteiro. Mas sabe quanto realmente sobra?</h1>
        <p className="mt-4 text-muted-foreground">Descubra quanto fica no seu bolso depois do combustível e dos gastos do trabalho.</p>
        <Button asChild size="lg" className="mt-6 w-full sm:w-auto"><a href="#calc">Calcular meu lucro grátis</a></Button>
        <p className="mt-2 text-xs text-muted-foreground">Sem cadastro para calcular</p>
      </section>

      <section id="calc" className="mx-auto max-w-xl px-5 pb-12">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-bold">Calculadora do dia</h2>
          <div className="grid gap-3">
            {campo("Quanto recebeu pelas entregas", rec, setRec)}
            {campo("Combustível", comb, setComb)}
            {campo("Outras despesas (alimentação, pedágio...)", out, setOut)}
          </div>
          <Button size="lg" className="mt-4 w-full" onClick={() => setCalc(true)}>Calcular</Button>
          {calc && (
            <div className="mt-5 space-y-2 rounded-xl bg-background p-4">
              <Linha l="Total recebido" v={BRL(r)} />
              <Linha l="Despesas informadas" v={`- ${BRL(g)}`} />
              <div className="border-t border-border pt-2">
                <p className="text-sm text-muted-foreground">Sobrou</p>
                <p className={`text-3xl font-extrabold ${tom}`}>{BRL(sobra)}</p>
                <p className="text-sm text-muted-foreground"><Percent className="mr-1 inline size-3" />{pct.toFixed(0)}% do que você recebeu</p>
              </div>
              <div className="mt-3 rounded-lg border border-primary/40 p-3 text-sm">
                Hoje sobraram {BRL(sobra)}. E na semana? E no mês? Com o Meu Entrega Pro você acompanha tudo, dia após dia.
                <Button asChild variant="link" className="h-auto p-0 pl-1"><a href="#app">Conheça o app</a></Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-xl px-5 pb-12">
        <h2 className="text-2xl font-bold">O dinheiro some sem você perceber</h2>
        <p className="mt-2 text-muted-foreground">Combustível, manutenção, multas e pacotes com insucesso vão comendo o ganho. Quem não anota, acha que lucra mais do que lucra.</p>
      </section>

      <section id="app" className="mx-auto max-w-3xl px-5 pb-12">
        <h2 className="text-center text-2xl font-bold">O que você encontra no Meu Entrega Pro</h2>
        <p className="mt-2 text-center text-muted-foreground">Tudo isso já está funcionando no app hoje.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {RECURSOS.map(({ icon: I, t, d }) => (
            <div key={t} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <I className="mt-0.5 size-5 shrink-0 text-primary" />
              <div><p className="font-semibold">{t}</p><p className="text-sm text-muted-foreground">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-xl px-5 pb-16 text-center">
        <div className="rounded-2xl border border-primary/50 bg-card p-6">
          <h2 className="text-2xl font-bold">Comece a controlar seus ganhos hoje</h2>
          <p className="mt-2 text-muted-foreground">Teste o Premium por 3 dias grátis. Depois, R$ 9,90/mês ou R$ 69,90/ano, se quiser continuar.</p>
          <Button asChild size="lg" className="mt-5 w-full"><Link to="/auth" search={{}}>Criar minha conta grátis</Link></Button>
          <p className="mt-3 text-xs text-muted-foreground">
            <Link to="/termos" className="underline">Termos</Link> · <Link to="/privacidade" className="underline">Privacidade</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Linha({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{l}</span><span className="font-semibold">{v}</span></div>;
}
