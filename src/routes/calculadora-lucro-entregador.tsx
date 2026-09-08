import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BRL, NUM } from "@/lib/calc";

const URL = "https://meuentregapro.app/calculadora-lucro-entregador";
const TITLE = "Quanto ganha um entregador? Calculadora de lucro — Entrega Pro";
const DESC =
  "Descubra quanto ganha um entregador por dia e por mês: calcule pacotes, KM, combustível e descontos e veja seu lucro líquido real.";

export const Route = createFileRoute("/calculadora-lucro-entregador")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: "Quanto ganha um entregador? Calcule seu lucro real" },
      {
        property: "og:description",
        content:
          "Calculadora gratuita para motoristas de entrega: informe pacotes, KM e combustível e veja o lucro líquido do dia e do mês.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Quanto ganha um entregador? Calculadora de lucro" },
      {
        name: "twitter:description",
        content: "Simule pacotes, KM e combustível e descubra seu lucro real por dia e por mês.",
      },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Calculadora de lucro do entregador",
          url: URL,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web, Android",
          description: DESC,
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
        }),
      },
    ],
  }),
  component: CalculadoraPage,
});

function Campo({
  label,
  sufixo,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  sufixo?: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 focus-within:border-primary">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-base outline-none"
        />
        {sufixo ? <span className="text-xs text-muted-foreground">{sufixo}</span> : null}
      </div>
    </label>
  );
}

const n = (v: string) => {
  const x = Number(String(v).replace(",", "."));
  return Number.isFinite(x) && x > 0 ? x : 0;
};

function CalculadoraPage() {
  const [pacotes, setPacotes] = useState("120");
  const [valorPacote, setValorPacote] = useState("2,20");
  const [diaria, setDiaria] = useState("0");
  const [km, setKm] = useState("110");
  const [consumo, setConsumo] = useState("10");
  const [precoCombustivel, setPrecoCombustivel] = useState("6,00");
  const [pnr, setPnr] = useState("0");
  const [perdidos, setPerdidos] = useState("0");
  const [diasMes, setDiasMes] = useState("22");
  const [manutencaoMes, setManutencaoMes] = useState("150");

  const r = useMemo(() => {
    const bruto = n(pacotes) * n(valorPacote) + n(diaria);
    const litros = n(consumo) > 0 ? n(km) / n(consumo) : 0;
    const combustivel = litros * n(precoCombustivel);
    const descontos = n(pnr) + n(perdidos);
    const liquido = bruto - descontos;
    const lucroDia = liquido - combustivel;
    const dias = n(diasMes);
    const lucroMes = lucroDia * dias - n(manutencaoMes);
    return {
      bruto,
      litros,
      combustivel,
      descontos,
      liquido,
      lucroDia,
      lucroMes,
      porPacote: n(pacotes) > 0 ? lucroDia / n(pacotes) : 0,
    };
  }, [pacotes, valorPacote, diaria, km, consumo, precoCombustivel, pnr, perdidos, diasMes, manutencaoMes]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-16">
      <header className="mb-6">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
          Quanto ganha um entregador? Calcule seu lucro real
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Preencha os dados de um dia normal de trabalho. A calculadora desconta combustível, PNR e
          pacotes perdidos para mostrar o que realmente sobra no seu bolso — por dia e por mês.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">Seu dia de trabalho</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Pacotes entregues no dia" value={pacotes} onChange={setPacotes} sufixo="pac." />
          <Campo label="Valor por pacote" value={valorPacote} onChange={setValorPacote} sufixo="R$" step="0.01" />
          <Campo label="Diária fixa (se houver)" value={diaria} onChange={setDiaria} sufixo="R$" step="0.01" />
          <Campo label="KM rodados no dia" value={km} onChange={setKm} sufixo="km" />
          <Campo label="Consumo do veículo" value={consumo} onChange={setConsumo} sufixo="km/L" step="0.1" />
          <Campo label="Preço do combustível" value={precoCombustivel} onChange={setPrecoCombustivel} sufixo="R$/L" step="0.01" />
          <Campo label="Descontos de PNR" value={pnr} onChange={setPnr} sufixo="R$" step="0.01" />
          <Campo label="Pacotes perdidos (R$)" value={perdidos} onChange={setPerdidos} sufixo="R$" step="0.01" />
          <Campo label="Dias trabalhados no mês" value={diasMes} onChange={setDiasMes} sufixo="dias" />
          <Campo label="Manutenção no mês" value={manutencaoMes} onChange={setManutencaoMes} sufixo="R$" step="0.01" />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">Seu resultado</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-card p-4">
            <p className="text-xs text-muted-foreground">Lucro real por dia</p>
            <p className="text-2xl font-bold text-primary">{BRL(r.lucroDia)}</p>
          </div>
          <div className="rounded-xl bg-card p-4">
            <p className="text-xs text-muted-foreground">Lucro real por mês</p>
            <p className="text-2xl font-bold text-primary">{BRL(r.lucroMes)}</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex justify-between"><span className="text-muted-foreground">Faturamento do dia</span><span>{BRL(r.bruto)}</span></li>
          <li className="flex justify-between"><span className="text-muted-foreground">(-) PNR e pacotes perdidos</span><span>{BRL(r.descontos)}</span></li>
          <li className="flex justify-between"><span className="text-muted-foreground">Lucro líquido do dia</span><span>{BRL(r.liquido)}</span></li>
          <li className="flex justify-between"><span className="text-muted-foreground">(-) Combustível ({NUM(r.litros, 1)} L)</span><span>{BRL(r.combustivel)}</span></li>
          <li className="flex justify-between"><span className="text-muted-foreground">Ganho por pacote</span><span>{BRL(r.porPacote)}</span></li>
        </ul>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5 text-center">
        <h2 className="text-lg font-semibold">Chega de calcular na mão</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No Entrega Pro você registra cada dia em segundos e vê automaticamente quanto trabalhou,
          quanto gastou e quanto vai receber — com histórico, gráficos e relatórios.
        </p>
        <Link
          to="/auth"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Criar minha conta grátis
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">
          <Link to="/sobre" className="underline">Saiba mais sobre o app</Link>
        </p>
      </section>

      <section className="mt-6 text-sm text-muted-foreground">
        <h2 className="mb-2 text-base font-semibold text-foreground">
          Quanto ganha um entregador por mês no Brasil?
        </h2>
        <p>
          O ganho varia muito conforme a rota, a cidade e o valor pago por pacote. Um entregador que
          faz cerca de 120 pacotes por dia, 22 dias por mês, costuma faturar bem mais do que sobra no
          fim do mês: combustível, manutenção, PNR e pacotes perdidos reduzem o resultado final. Por
          isso o número que importa é o lucro real — e não o valor bruto da rota.
        </p>
      </section>
    </main>
  );
}
