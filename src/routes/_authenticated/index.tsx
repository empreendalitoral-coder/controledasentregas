import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useFullStore, actions } from "@/lib/store";
import { computeResumo, currentMonthRange, BRL, NUM, formatHoras } from "@/lib/calc";
import {
  Plus,
  Pencil,
  ChevronRight,
  Calendar,
  Upload,
  X,
  Crown,
  Repeat,
  Coffee,
  AlertCircle,
  CalendarCheck,
  CalendarOff,
  Clock,
  Package,
  PackageX,
  Ban,
  Route as RouteIcon,
  Fuel,
  Wallet,
  Sparkles,
  FileText,
  PieChart,
  CreditCard,
  Check,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { usePremium } from "@/lib/premium";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Entrega Pro — Painel" },
      {
        name: "description",
        content: "Dashboard do motorista: resumo do mês, meta e próximo recebimento.",
      },
      { property: "og:title", content: "Entrega Pro — Painel" },
      {
        property: "og:description",
        content: "Veja seu resumo do mês, sua meta e o próximo recebimento no Entrega Pro.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://meuentregapro.app/" }],
  }),

  component: Dashboard,
});

function Dashboard() {
  const state = useFullStore();
  const premium = usePremium();
  const periodo = currentMonthRange();
  const r = computeResumo(state, periodo);
  const nome = state.motorista.nome || "Motorista";
  const meta = state.meta_mensal || 0;
  const pct = meta > 0 ? Math.min(100, Math.round((r.lucro_liquido / meta) * 100)) : 0;

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    if (state.hydrated && actions.hasLegacyData()) setShowImport(true);
  }, [state.hydrated]);

  async function importar() {
    setImporting(true);
    try {
      await actions.importLegacyLocalStorage();
      toast.success("Dados importados!");
      setShowImport(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    } finally {
      setImporting(false);
    }
  }

  // Lançamento de hoje / atalhos rápidos
  const hojeStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const lancHoje = state.lancamentos.find((l) => l.data === hojeStr);
  const temUltimo = state.lancamentos.some((l) => l.trabalhou && l.data !== hojeStr);
  const [folgando, setFolgando] = useState(false);

  async function marcarFolga() {
    setFolgando(true);
    try {
      await actions.addLancamento({ data: hojeStr, trabalhou: false });
      toast.success("Dia marcado como folga");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setFolgando(false);
    }
  }

  // Resumo dos últimos 7 dias
  const fim7 = new Date();
  fim7.setHours(23, 59, 59, 999);
  const ini7 = new Date();
  ini7.setDate(ini7.getDate() - 6);
  ini7.setHours(0, 0, 0, 0);
  const r7 = computeResumo(state, { inicio: ini7, fim: fim7 });

  // próximo recebimento pendente
  const pendentes = [...state.recebimentos]
    .filter((x) => x.status === "pendente")
    .sort(
      (a, b) =>
        new Date(a.data_pagamento).getTime() - new Date(b.data_pagamento).getTime(),
    );
  const prox = pendentes[0];

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <AppShell title="Entrega Pro">
      {showImport && (
        <div className="ep-card mb-3 bg-primary/10 border-primary/40 flex items-start gap-3">
          <Upload className="size-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-sm">Encontramos dados antigos neste aparelho</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Quer importar lançamentos, recebimentos e configurações que estavam salvas localmente?
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={importar} disabled={importing} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
                {importing ? "Importando..." : "Importar agora"}
              </button>
              <button onClick={() => setShowImport(false)} className="h-9 px-3 rounded-md bg-secondary text-xs">Depois</button>
            </div>
          </div>
          <button onClick={() => setShowImport(false)} className="text-muted-foreground"><X className="size-4" /></button>
        </div>
      )}

      {/* Saudação + perfil */}
      <Link to="/perfil" className="flex items-center gap-3 px-1 py-1">
        <div className="size-12 rounded-full bg-secondary grid place-items-center overflow-hidden border-2 border-primary/60 shrink-0">
          {state.motorista.foto ? (
            <img src={state.motorista.foto} alt={nome} className="size-full object-cover" />
          ) : (
            <span className="text-base font-semibold text-muted-foreground">
              {nome.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-muted-foreground">{saudacao},</div>
          <div className="font-semibold text-base truncate leading-tight">{nome}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground truncate">
              {state.motorista.transportadora || "Toque para configurar perfil"}
            </span>
            {state.motorista.placa && (
              <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded border border-primary/60 text-primary shrink-0">
                {state.motorista.placa}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="size-5 text-muted-foreground shrink-0" />
      </Link>

      {/* Destaque: lucro do mês + meta */}
      <section className="ep-highlight mt-3">
        <div className="flex items-center justify-between">
          <div className="ep-label">Lucro líquido do mês</div>
          <Link to="/resumo" className="text-xs text-primary">
            Ver mais →
          </Link>
        </div>
        <div className="ep-highlight-value mt-1">{BRL(r.lucro_liquido)}</div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            Meta: <strong className="text-foreground/90">{BRL(meta)}</strong>
            <Link to="/perfil" className="text-primary ml-1 inline-flex items-center">
              <Pencil className="size-3" />
            </Link>
          </span>
          <span className="font-semibold text-primary">{pct}%</span>
        </div>
        <div className="ep-progress mt-2">
          <span style={{ width: `${pct}%` }} />
        </div>
      </section>

      {/* Hoje */}
      {state.hydrated && !lancHoje && (
        <section className="ep-card mt-3 border-warning/40 bg-warning/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-sm">Você ainda não lançou hoje</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Registre o dia em poucos toques.
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <Link
              to="/lancamento/$id"
              params={{ id: "novo" }}
              className="h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.99] transition"
            >
              <Plus className="size-4" /> Lançar hoje
            </Link>
            <div className="grid grid-cols-2 gap-2">
              {temUltimo && (
                <Link
                  to="/lancamento/$id"
                  params={{ id: "novo" }}
                  search={{ repetir: true }}
                  className="h-11 rounded-xl bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.99] transition"
                >
                  <Repeat className="size-4" /> Repetir último
                </Link>
              )}
              <button
                onClick={marcarFolga}
                disabled={folgando}
                className="h-11 rounded-xl bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.99] transition"
              >
                <Coffee className="size-4" /> {folgando ? "Salvando..." : "Marcar folga"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Convite Premium */}
      {!premium.loading && !premium.ativo && <PremiumCTA />}

      {premium.ativo && premium.plano === "teste" && (
        <Link to="/premium" className="ep-card mt-3 flex items-center gap-2 bg-primary/10 border-primary/40">
          <Crown className="size-5 text-primary shrink-0" />
          <div className="text-xs flex-1">
            <span className="font-semibold">Teste Premium</span> — {premium.diasRestantes} dias restantes
            <div className="ep-progress mt-1.5">
              <span style={{ width: `${Math.min(100, (premium.diasRestantes / 7) * 100)}%` }} />
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      {/* Números do mês */}
      <div className="ep-section-title mt-4">Resumo do mês</div>
      <div className="ep-bento">
        <Metric icon={CalendarCheck} label="Dias trabalhados" value={NUM(r.dias_trabalhados)} />
        <Metric icon={CalendarOff} label="Dias de folga" value={NUM(r.dias_folga)} />
        <Metric icon={Clock} label="Horas" value={formatHoras(r.horas)} />
        <Metric icon={Package} label="Pacotes" value={NUM(r.pacotes)} />
        <Metric icon={Ban} label="Insucessos" value={NUM(r.insucessos)} />
        <Metric icon={AlertCircle} label="PNR" value={NUM(r.pnr)} />
        <Metric icon={PackageX} label="Perdidos" value={NUM(r.pacotes_perdidos)} />
        <Metric icon={RouteIcon} label="KM rodados" value={`${NUM(r.km)} km`} />
        <Metric icon={Fuel} label="Combustível" value={BRL(r.combustivel)} tone="neg" />
        <Metric icon={Wallet} label="Valor bruto" value={BRL(r.valor_bruto)} />
      </div>

      {/* Últimos 7 dias */}
      <div className="ep-section-title mt-4">Últimos 7 dias</div>
      <section className="ep-card">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="ep-label">Lucro da semana</div>
            <div className="text-2xl font-bold ep-money-pos leading-tight">{BRL(r7.lucro_liquido)}</div>
          </div>
          <div className="text-right text-[11px] text-muted-foreground leading-relaxed">
            <div>{NUM(r7.dias_trabalhados)} dias trabalhados</div>
            <div>{NUM(r7.pacotes)} pacotes</div>
          </div>
        </div>
        <div className="ep-bento mt-3">
          <Metric icon={Wallet} label="Valor bruto" value={BRL(r7.valor_bruto)} />
          <Metric icon={Fuel} label="Combustível" value={BRL(r7.combustivel)} tone="neg" />
        </div>
      </section>

      {/* Próximo Recebimento */}
      <div className="ep-section-title mt-4">Próximo recebimento</div>
      <section className="ep-card">
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

function PremiumCTA() {
  const beneficios: { icon: ComponentType<{ className?: string }>; texto: string }[] = [
    { icon: FileText, texto: "Fechamento por quinzena e relatórios em PDF" },
    { icon: PieChart, texto: "Gráficos e metas financeiras completas" },
    { icon: CreditCard, texto: "Controle de contas fixas e cartões" },
  ];
  return (
    <Link to="/premium" className="ep-premium-cta mt-3 block active:scale-[0.995] transition">
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <span className="ep-icon-chip">
            <Sparkles className="size-4" />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base leading-tight">Desbloqueie a Central Financeira</h2>
              <span className="ep-pro-tag">PRO</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Saiba para onde vai cada real que você ganha.
            </div>
          </div>
        </div>

        <ul className="mt-3 space-y-1.5">
          {beneficios.map((b) => (
            <li key={b.texto} className="flex items-center gap-2 text-xs">
              <Check className="size-3.5 text-primary shrink-0" />
              <span className="text-foreground/90">{b.texto}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="leading-tight">
            <div className="text-xl font-extrabold text-primary">R$ 3,90</div>
            <div className="text-[10px] text-muted-foreground">por mês · ou R$ 24,90/ano</div>
          </div>
          <span className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1.5">
            Começar agora <ChevronRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
  wide,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "pos" | "neg";
  wide?: boolean;
}) {
  return (
    <div className={`ep-metric${wide ? " ep-bento-wide" : ""}`}>
      <div className="ep-metric-head">
        <Icon className="size-3.5 text-primary/80 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className={`ep-metric-value ${tone === "pos" ? "ep-money-pos" : tone === "neg" ? "ep-money-neg" : ""}`}>
        {value}
      </div>
    </div>
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
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diffDias = Math.round(
    (new Date(prox.data_pagamento + "T00:00:00").getTime() - hoje.getTime()) / 86400000,
  );
  const atrasado = diffDias < 0;
  const dias = Math.abs(diffDias);
  return (
    <>
      <div
        className={`ep-stat-tile text-center ${atrasado ? "border border-destructive/50 bg-destructive/10" : ""}`}
      >
        <div className="font-semibold">
          {fmt(prox.data_inicial)} até {fmt(prox.data_final)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Pagamento previsto: {fmt(prox.data_pagamento)}
        </div>
        {atrasado ? (
          <div className="text-xs text-destructive font-semibold mt-2">
            Atrasado há <span className="font-bold">{dias}</span> {dias === 1 ? "dia" : "dias"}
          </div>
        ) : (
          <div className="text-xs text-primary font-medium mt-2">
            Faltam <span className="font-bold">{dias}</span> dias para o pagamento
          </div>
        )}
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
