import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useFullStore, actions } from "@/lib/store";
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
} from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import { BRL, computeResumo, rangeFromStrings } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/mais")({
  head: () => ({
    meta: [
      { title: "Mais — Entrega Pro" },
      { name: "description", content: "Calendário, backup, configurações e mais." },
    ],
  }),
  component: MaisPage,
});

function MaisPage() {
  const state = useFullStore();
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
    if (file.size > 5_000_000) {
      toast.error("Arquivo grande demais (máx 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        actions.importJSON(String(reader.result));
        toast.success("Backup restaurado");
      } catch {
        toast.error("Arquivo inválido");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function gerarRelatorio() {
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Habilite pop-ups para imprimir");
      return;
    }
    const now = new Date();
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const r = computeResumo(state, { inicio, fim });
    const html = `<!doctype html><html><head><meta charset='utf-8'><title>Relatório — Entrega Pro</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{margin:0 0 4px}h2{margin:24px 0 8px;font-size:16px}table{width:100%;border-collapse:collapse;margin-top:8px}td,th{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left;font-size:13px}.r{text-align:right}.pos{color:#0a7f3e;font-weight:600}.neg{color:#b00020;font-weight:600}</style>
</head><body>
<h1>Entrega Pro — Relatório Mensal</h1>
<div>${state.motorista.nome || "Motorista"} ${state.motorista.placa ? "• " + state.motorista.placa : ""}</div>
<div>${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}</div>
<h2>Resumo</h2>
<table>
<tr><td>Dias trabalhados</td><td class='r'>${r.dias_trabalhados}</td></tr>
<tr><td>Pacotes entregues</td><td class='r'>${r.pacotes}</td></tr>
<tr><td>KM rodados</td><td class='r'>${r.km}</td></tr>
<tr><td>Valor bruto</td><td class='r pos'>${BRL(r.valor_bruto)}</td></tr>
<tr><td>Descontos</td><td class='r neg'>- ${BRL(r.descontos)}</td></tr>
<tr><td>Combustível</td><td class='r neg'>- ${BRL(r.combustivel)}</td></tr>
<tr><td>Manutenções</td><td class='r neg'>- ${BRL(r.manutencoes)}</td></tr>
<tr><td><b>Lucro líquido</b></td><td class='r pos'><b>${BRL(r.lucro_liquido)}</b></td></tr>
<tr><td><b>Lucro real</b></td><td class='r pos'><b>${BRL(r.lucro_real)}</b></td></tr>
</table>
<script>window.print()</script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  }

  function resetar() {
    if (!confirm("Apagar TODOS os dados? Esta ação não pode ser desfeita.")) return;
    if (!confirm("Tem certeza absoluta?")) return;
    actions.reset();
    toast.success("Dados apagados");
  }

  const items: { icon: typeof Calendar; label: string; onClick?: () => void; to?: string }[] = [
    { icon: User, label: "Perfil do motorista", to: "/perfil" },
    { icon: Fuel, label: "Abastecimentos", to: "/abastecimentos" },
    { icon: Wrench, label: "Manutenção", to: "/manutencao" },
    { icon: Calendar, label: "Calendário de recebimentos", to: "/recebimentos" },
    { icon: FileText, label: "Relatório mensal (PDF/Imprimir)", onClick: gerarRelatorio },
    { icon: TrendingUp, label: "Lucro Real", to: "/graficos" },
    { icon: Download, label: "Exportar backup (JSON)", onClick: exportar },
    { icon: Upload, label: "Importar backup", onClick: () => fileRef.current?.click() },
    { icon: Settings, label: "Resumo mensal completo", to: "/resumo" },
    { icon: RotateCcw, label: "Apagar todos os dados", onClick: resetar },
    { icon: Info, label: "Sobre o app", onClick: () => toast.info("Entrega Pro v1.0 — 100% offline") },
  ];

  return (
    <AppShell title="Mais">
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={importar}
      />

      <Link to="/perfil" className="ep-card flex items-center gap-3">
        <div className="size-12 rounded-full bg-secondary grid place-items-center overflow-hidden border border-border">
          {state.motorista.foto ? (
            <img src={state.motorista.foto} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-lg">
              {(state.motorista.nome || "?").slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{state.motorista.nome || "Configurar perfil"}</div>
          <div className="text-xs text-muted-foreground truncate">
            {state.motorista.transportadora || "Adicione seus dados"}
          </div>
        </div>
      </Link>

      <ul className="mt-4 ep-card divide-y divide-border">
        {items.map((it) => {
          const Icon = it.icon;
          const inner = (
            <div className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
              <Icon className="size-5 text-primary" />
              <span className="flex-1 text-sm">{it.label}</span>
              <span className="text-muted-foreground">›</span>
            </div>
          );
          return (
            <li key={it.label}>
              {it.to ? (
                <Link to={it.to}>{inner}</Link>
              ) : (
                <button onClick={it.onClick} className="w-full text-left">
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Versão PRO highlight */}
      <div className="mt-4 ep-card bg-gradient-to-br from-primary/10 via-card to-card border-primary/30">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-lg bg-primary/20 grid place-items-center text-primary">
            👑
          </div>
          <div className="flex-1">
            <div className="font-bold text-primary">Versão PRO</div>
            <div className="text-xs text-muted-foreground">
              Desbloqueie todos os recursos e tenha controle total!
            </div>
          </div>
        </div>
        <button
          onClick={() => toast.info("Tudo já está liberado nesta versão 🎉")}
          className="mt-3 w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold"
        >
          Ver planos
        </button>
      </div>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        Entrega Pro • 100% offline • Seus dados ficam só no seu aparelho
      </div>

    </AppShell>
  );
}
