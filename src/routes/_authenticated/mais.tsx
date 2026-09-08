import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useFullStore, actions } from "@/lib/store";
import { usePremium, useIsAdmin } from "@/lib/premium";
import {
  Calendar,
  FileText,
  TrendingUp,
  Download,
  Upload,
  Settings,
  Info,
  Fuel,
  Wrench,
  User,
  RotateCcw,
  Crown,
  LogOut,
  Shield,
  Wallet2,
} from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import { BRL, computeResumo } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/mais")({
  head: () => ({ meta: [{ title: "Mais — Entrega Pro" }] }),
  component: MaisPage,
});

function MaisPage() {
  const state = useFullStore();
  const premium = usePremium();
  const admin = useIsAdmin();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  function exportar() {
    try {
      const json = actions.exportJSON();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `entrega-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup exportado");
    } catch {
      toast.error("Falha ao exportar");
    }
  }

  function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await actions.importJSON(String(reader.result));
        toast.success("Backup restaurado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Arquivo inválido");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function gerarRelatorio() {
    const win = window.open("", "_blank");
    if (!win) { toast.error("Habilite pop-ups"); return; }
    const now = new Date();
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const r = computeResumo(state, { inicio, fim });
    const html = `<!doctype html><html><head><meta charset='utf-8'><title>Relatório</title>
<style>body{font-family:system-ui,sans-serif;padding:24px}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:8px}td{padding:6px 8px;border-bottom:1px solid #ddd;font-size:13px}.r{text-align:right}.pos{color:#0a7f3e;font-weight:600}.neg{color:#b00020;font-weight:600}</style></head><body>
<h1>Entrega Pro — Relatório Mensal</h1>
<div>${state.motorista.nome || "Motorista"}</div>
<div>${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}</div>
<table>
<tr><td>Dias trabalhados</td><td class='r'>${r.dias_trabalhados}</td></tr>
<tr><td>Pacotes</td><td class='r'>${r.pacotes}</td></tr>
<tr><td>KM</td><td class='r'>${r.km}</td></tr>
<tr><td>Bruto</td><td class='r pos'>${BRL(r.valor_bruto)}</td></tr>
<tr><td>Descontos</td><td class='r neg'>- ${BRL(r.descontos)}</td></tr>
<tr><td>Combustível</td><td class='r neg'>- ${BRL(r.combustivel)}</td></tr>
<tr><td><b>Lucro real</b></td><td class='r pos'><b>${BRL(r.lucro_real)}</b></td></tr>
</table>
<script>window.print()</script></body></html>`;
    win.document.write(html);
    win.document.close();
  }

  async function resetar() {
    if (!confirm("Apagar TODOS os dados desta conta?")) return;
    if (!confirm("Tem certeza absoluta?")) return;
    try { await actions.reset(); toast.success("Dados apagados"); } catch (e) { toast.error(e instanceof Error ? e.message : ""); }
  }

  async function sair() {
    await actions.signOut();
    navigate({ to: "/auth" });
  }

  const items: { icon: typeof Calendar; label: string; onClick?: () => void; to?: string; highlight?: boolean }[] = [
    { icon: User, label: "Perfil do motorista", to: "/perfil" },
    { icon: Wallet2, label: "Central Financeira Premium", to: "/financeiro", highlight: true },
    { icon: Fuel, label: "Abastecimentos", to: "/abastecimentos" },
    { icon: Wrench, label: "Manutenção", to: "/manutencao" },
    { icon: Calendar, label: "Recebimentos", to: "/recebimentos" },
    { icon: FileText, label: "Relatório mensal (imprimir)", onClick: gerarRelatorio },
    { icon: TrendingUp, label: "Gráficos e Lucro Real", to: "/graficos" },
    { icon: Download, label: "Exportar backup (JSON)", onClick: exportar },
    { icon: Upload, label: "Importar backup", onClick: () => fileRef.current?.click() },
    { icon: Settings, label: "Resumo mensal completo", to: "/resumo" },
    ...(admin.isAdmin ? [{ icon: Shield, label: "Painel Administrativo", to: "/admin" as const }] : []),
    { icon: RotateCcw, label: "Apagar todos os dados", onClick: resetar },
    { icon: LogOut, label: "Sair da conta", onClick: sair },
    { icon: Info, label: "Sobre o app", onClick: () => toast.info("Entrega Pro v2.0") },
  ];

  return (
    <AppShell title="Mais">
      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importar} />

      <Link to="/perfil" className="ep-card flex items-center gap-3">
        <div className="size-12 rounded-full bg-secondary grid place-items-center overflow-hidden border border-border">
          {state.motorista.foto ? (
            <img src={state.motorista.foto} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-lg">{(state.motorista.nome || "?").slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{state.motorista.nome || "Configurar perfil"}</div>
          <div className="text-xs text-muted-foreground truncate">
            {state.motorista.transportadora || "Adicione seus dados"}
          </div>
        </div>
        {premium.ativo && <span className="ep-badge-premium"><Crown className="size-3" /> Premium</span>}
      </Link>

      <ul className="mt-4 ep-card divide-y divide-border">
        {items.map((it) => {
          const Icon = it.icon;
          const inner = (
            <div className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
              <Icon className={`size-5 ${it.highlight ? "text-primary" : "text-foreground/80"}`} />
              <span className={`flex-1 text-sm ${it.highlight ? "font-semibold" : ""}`}>{it.label}</span>
              {it.highlight && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {!premium.ativo && <Lock className="size-3" />} PRO
                </span>
              )}
              <span className="text-muted-foreground">›</span>
            </div>
          );

          return (
            <li key={it.label}>
              {it.to ? <Link to={it.to}>{inner}</Link> : <button onClick={it.onClick} className="w-full text-left">{inner}</button>}
            </li>
          );
        })}
      </ul>

      {!premium.ativo && !premium.loading && (
        <Link to="/premium" className="mt-4 ep-card block bg-gradient-to-br from-primary/15 via-card to-card border-primary/40">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-primary/25 grid place-items-center text-primary">
              <Crown className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-primary">Assine o Premium</div>
              <div className="text-xs text-muted-foreground">
                Desbloqueie a Central Financeira completa.
              </div>
            </div>
          </div>
          <div className="mt-3 w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold grid place-items-center">
            Ver planos
          </div>
        </Link>
      )}

      {premium.ativo && premium.plano === "teste" && (
        <Link to="/premium" className="mt-4 ep-card block">
          <div className="text-sm">
            <span className="font-semibold text-primary">Teste grátis ativo</span> — restam {premium.diasRestantes} dias.
            Toque para assinar e continuar com tudo liberado.
          </div>
        </Link>
      )}
    </AppShell>
  );
}
