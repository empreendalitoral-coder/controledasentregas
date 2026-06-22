import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useFullStore } from "@/lib/store";
import { computeResumo, currentMonthRange, BRL, NUM, formatHoras } from "@/lib/calc";
import { Plus, Pencil, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrega Pro — Painel" },
      {
        name: "description",
        content: "Dashboard do motorista: resumo do mês, meta e próximo recebimento.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const state = useFullStore();
  const periodo = currentMonthRange();
  const r = computeResumo(state, periodo);
  const nome = state.motorista.nome || "Motorista";
  const meta = state.meta_mensal || 0;
  const pct = meta > 0 ? Math.min(100, Math.round((r.lucro_liquido / meta) * 100)) : 0;

  // próximo recebimento pendente
  const pendentes = [...state.recebimentos]
    .filter((x) => x.status === "pendente")
    .sort(
      (a, b) =>
        new Date(a.data_pagamento).getTime() - new Date(b.data_pagamento).getTime(),
    );
  const prox = pendentes[0];

  return (
    <AppShell title="Entrega Pro">
      {/* Perfil */}
      <Link to="/perfil" className="ep-card flex items-center gap-3 hover:border-primary/40 transition">
        <div className="size-14 rounded-full bg-secondary grid place-items-center overflow-hidden border-2 border-primary/60">
          {state.motorista.foto ? (
            <img src={state.motorista.foto} alt={nome} className="size-full object-cover" />
          ) : (
            <span className="text-lg font-semibold text-muted-foreground">
              {nome.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base truncate">{nome}</div>
          <div className="text-xs text-muted-foreground truncate">
            {state.motorista.transportadora || "Toque para configurar perfil"}
          </div>
          {state.motorista.placa && (
            <div className="mt-1.5 inline-block text-[11px] font-mono font-bold tracking-wider px-2 py-0.5 rounded border border-primary/60 text-primary">
              {state.motorista.placa}
            </div>
          )}
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </Link>

      {/* Resumo do Mês */}
      <section className="ep-card mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Resumo do Mês</h2>
          <Link to="/resumo" className="text-xs text-primary">
            Ver mais →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Dias trabalhados" value={NUM(r.dias_trabalhados)} />
          <Stat label="Dias de folga" value={NUM(r.dias_folga)} />
          <Stat label="Horas trabalhadas" value={formatHoras(r.horas)} />
          <Stat label="Pacotes entregues" value={NUM(r.pacotes)} />
          <Stat label="Insucessos" value={NUM(r.insucessos)} />
          <Stat label="PNR" value={NUM(r.pnr)} />
          <Stat label="Pacotes perdidos" value={NUM(r.pacotes_perdidos)} />
          <Stat label="KM rodados" value={`${NUM(r.km)} km`} />
          <Stat label="Combustível gasto" value={BRL(r.combustivel)} />
          <Stat label="Valor bruto" value={BRL(r.valor_bruto)} />
        </div>
        <div className="mt-3 ep-stat-tile">
          <div className="ep-label">Valor líquido</div>
          <div className="text-2xl font-bold ep-money-pos">
            {BRL(r.lucro_liquido)}
          </div>
        </div>
      </section>

      {/* Meta do Mês */}
      <section className="ep-card mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Meta do Mês</h2>
          <Link to="/perfil" className="text-xs text-primary flex items-center gap-1">
            <Pencil className="size-3" /> Editar
          </Link>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Meta: {BRL(meta)}</span>
          <span>Atual: {BRL(r.lucro_liquido)}</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 text-right text-xs font-medium text-primary">{pct}%</div>
      </section>

      {/* Próximo Recebimento */}
      <section className="ep-card mt-4">
        <h2 className="font-semibold mb-3">Próximo Recebimento</h2>
        {prox ? (
          <ProxRecebimento prox={prox} />
        ) : (
          <div className="text-sm text-muted-foreground">
            Nenhum período de recebimento cadastrado.{" "}
            <Link to="/recebimentos" className="text-primary">
              Criar agora →
            </Link>
          </div>
        )}
      </section>

      {/* CTA novo lançamento */}
      <Link
        to="/lancamento/$id"
        params={{ id: "novo" }}
        className="mt-4 flex items-center justify-center gap-2 h-14 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 active:scale-[0.99] transition"
      >
        <Plus className="size-5" /> Novo Lançamento
      </Link>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ep-stat-tile">
      <div className="ep-label">{label}</div>
      <div className="ep-value">{value}</div>
    </div>
  );
}

function ProxRecebimento({
  prox,
}: {
  prox: { nome_periodo: string; data_inicial: string; data_final: string; data_pagamento: string };
}) {
  const state = useFullStore();
  const periodo = {
    inicio: new Date(prox.data_inicial + "T00:00:00"),
    fim: new Date(prox.data_final + "T23:59:59"),
  };
  const r = computeResumo(state, periodo);
  const previsto = r.valor_bruto - r.descontos - r.combustivel;
  const fmt = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
  const dias = Math.max(
    0,
    Math.ceil(
      (new Date(prox.data_pagamento + "T00:00:00").getTime() - Date.now()) /
        86400000,
    ),
  );
  return (
    <>
      <div className="ep-stat-tile text-center">
        <div className="font-semibold">
          {fmt(prox.data_inicial)} até {fmt(prox.data_final)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Pagamento previsto: {fmt(prox.data_pagamento)}
        </div>
        <div className="text-xs text-primary font-medium mt-2">
          Faltam <span className="font-bold">{dias}</span> dias para o pagamento
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Stat label="Dias trabalhados" value={NUM(r.dias_trabalhados)} />
        <Stat label="Dias de folga" value={NUM(r.dias_folga)} />
      </div>
      <Line label="Valor bruto" value={BRL(r.valor_bruto)} pos />
      <Line label="Descontos (PNR + perdidos)" value={`- ${BRL(r.descontos)}`} neg />
      <Line label="Combustível" value={`- ${BRL(r.combustivel)}`} neg />
      <div className="mt-4 rounded-xl bg-success p-4 text-center shadow-lg shadow-success/20">
        <div className="text-xs font-bold tracking-wide text-success-foreground/80">
          VALOR LÍQUIDO PREVISTO
        </div>
        <div className="text-3xl font-extrabold text-success-foreground mt-1">
          {BRL(previsto)}
        </div>
      </div>
      <Link
        to="/recebimentos"
        className="mt-3 flex items-center justify-center gap-2 h-11 rounded-md border border-border text-sm text-foreground/90 hover:border-primary/50 transition"
      >
        <Calendar className="size-4" />
        Ver todos os recebimentos
      </Link>
    </>
  );
}

function Line({ label, value, pos, neg }: { label: string; value: string; pos?: boolean; neg?: boolean }) {
  return (
    <div className="flex items-center justify-between mt-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={pos ? "ep-money-pos" : neg ? "ep-money-neg" : ""}>{value}</span>
    </div>
  );
}
