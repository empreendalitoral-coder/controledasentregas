import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, CheckCircle2, Database, FileJson, RefreshCw, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { computeResumo, horasTrabalhadas, kmRodado, lucroLiquido } from "@/lib/calc";
import { actions, type State, useFullStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/diagnostico")({
  head: () => ({
    meta: [
      { title: "Diagnóstico do Aplicativo — Entrega Pro" },
      { name: "description", content: "Verificação segura dos cálculos, dados e backups da conta no Entrega Pro." },
      { property: "og:title", content: "Diagnóstico do Aplicativo — Entrega Pro" },
      { property: "og:description", content: "Verificação segura dos cálculos, dados e backups da conta no Entrega Pro." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/diagnostico" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/diagnostico" }],
  }),
  component: DiagnosticsPage,
});

type Check = { name: string; detail: string; ok: boolean };

function validateBackup(value: unknown): value is Partial<State> {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<State>;
  return (
    typeof data.motorista === "object" &&
    typeof data.meta_mensal === "number" &&
    Array.isArray(data.lancamentos) &&
    Array.isArray(data.recebimentos) &&
    Array.isArray(data.abastecimentos) &&
    Array.isArray(data.manutencoes)
  );
}

function runChecks(state: State): Check[] {
  const sample = {
    id: "diagnostico",
    data: "2026-01-15",
    trabalhou: true,
    hora_inicio: "08:00",
    hora_fim: "17:30",
    km_inicial: 100,
    km_final: 180,
    valor_dia: 250,
    valor_pnr: 10,
    valor_perdidos: 5,
  };
  const calculationOk =
    kmRodado(sample) === 80 &&
    horasTrabalhadas(sample) === 9.5 &&
    lucroLiquido(sample) === 235;

  let backupOk = false;
  let backupDetail = "O arquivo não pôde ser criado e lido novamente.";
  try {
    const json = actions.exportJSON();
    const parsed: unknown = JSON.parse(json);
    backupOk = validateBackup(parsed);
    if (backupOk) {
      backupDetail = `Estrutura válida (${new Blob([json]).size.toLocaleString("pt-BR")} bytes), sem restaurar dados.`;
    }
  } catch {
    backupOk = false;
  }

  const validDates = [...state.lancamentos, ...state.abastecimentos, ...state.manutencoes].every(
    (item) => /^\d{4}-\d{2}-\d{2}$/.test(item.data),
  );
  const finiteValues = state.lancamentos.every((item) =>
    [item.valor_dia, item.valor_pnr, item.valor_perdidos, item.km_inicial, item.km_final]
      .filter((value) => value != null)
      .every((value) => Number.isFinite(value)),
  );
  const now = new Date();
  const summary = computeResumo(state, {
    inicio: new Date(now.getFullYear(), now.getMonth(), 1),
    fim: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  });

  return [
    { name: "Cálculos principais", ok: calculationOk, detail: calculationOk ? "KM, horas e lucro conferem com os resultados esperados." : "Um resultado conhecido não correspondeu ao cálculo esperado." },
    { name: "Dados da conta", ok: state.hydrated, detail: state.hydrated ? `${state.lancamentos.length} lançamento(s), ${state.recebimentos.length} recebimento(s), ${state.abastecimentos.length} abastecimento(s) e ${state.manutencoes.length} manutenção(ões) carregados.` : "Os dados ainda não terminaram de carregar." },
    { name: "Consistência dos registros", ok: validDates && finiteValues, detail: validDates && finiteValues ? "Datas e valores numéricos estão em formatos válidos." : "Há registro com data ou valor numérico inválido." },
    { name: "Resumo do mês", ok: Object.values(summary).every(Number.isFinite), detail: Object.values(summary).every(Number.isFinite) ? "Todos os totais mensais foram calculados sem valores inválidos." : "Foi encontrado um total mensal inválido." },
    { name: "Exportação do backup", ok: backupOk, detail: backupDetail },
    { name: "Compatibilidade da importação", ok: backupOk, detail: backupOk ? "O backup tem os campos exigidos pela importação. Nenhum dado foi gravado durante o teste." : "O arquivo exportado não tem a estrutura esperada para importação." },
    { name: "Armazenamento local legado", ok: true, detail: actions.hasLegacyData() ? "Há dados antigos disponíveis para migração manual." : "Nenhum dado antigo pendente foi encontrado neste aparelho." },
  ];
}

function DiagnosticsPage() {
  const state = useFullStore();
  const [run, setRun] = useState(0);
  const checks = useMemo(() => runChecks(state), [state, run]);
  const failed = checks.filter((check) => !check.ok).length;

  return (
    <AppShell title="Diagnóstico do aplicativo" back="/mais">
      <div className="space-y-5">
        <div className="ep-page-intro">
          <div className="ep-icon-chip"><Activity className="size-5" /></div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{failed === 0 ? "Tudo funcionando" : `${failed} falha(s) encontrada(s)`}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Os testes são somente leitura e não alteram seus registros.</p>
          </div>
        </div>

        <section>
          <h2 className="ep-section-title"><Database className="size-3.5" /> Verificações</h2>
          <ul className="ep-card divide-y divide-border p-0 overflow-hidden">
            {checks.map((check) => {
              const Icon = check.ok ? CheckCircle2 : XCircle;
              return (
                <li key={check.name} className="flex items-start gap-3 p-4">
                  <div className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${check.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{check.name}</div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{check.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="ep-card flex items-start gap-3">
          <FileJson className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">A restauração é validada pela estrutura do arquivo. Para proteger seus dados, este diagnóstico nunca executa uma importação real.</p>
        </div>

        <Button type="button" className="h-11 w-full" onClick={() => setRun((value) => value + 1)}>
          <RefreshCw /> Executar novamente
        </Button>
      </div>
    </AppShell>
  );
}