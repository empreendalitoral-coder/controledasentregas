import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import {
  listNotificationLogs,
  clearNotificationLogs,
} from "@/lib/notifications/admin.functions";
import { toast } from "sonner";
import { Trash2, CheckCircle2, XCircle, Inbox } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/perfil/notificacoes/logs")({
  head: () => ({
    meta: [
      { title: "Logs de notificações — Entrega Pro" },
      { name: "description", content: "Histórico de notificações enviadas para o seu aparelho, com status de entrega." },
      { property: "og:title", content: "Logs de notificações — Entrega Pro" },
      { property: "og:description", content: "Histórico de notificações enviadas para o seu aparelho, com status de entrega." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/perfil/notificacoes/logs" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/perfil/notificacoes/logs" }],
  }),
  component: LogsPage,
});

function LogsPage() {
  const load = useServerFn(listNotificationLogs);
  const clear = useServerFn(clearNotificationLogs);
  const [busy, setBusy] = useState(false);

  const q = useQuery({ queryKey: ["notif-logs"], queryFn: () => load() });

  const logs = q.data?.logs ?? [];
  const enviadas = logs.filter((l) => l.sucesso).length;
  const falhas = logs.length - enviadas;

  async function limpar() {
    if (!confirm("Apagar todo o histórico de notificações?")) return;
    setBusy(true);
    try {
      await clear();
      await q.refetch();
      toast.success("Logs limpos");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Logs de notificações" back="/perfil/notificacoes">
      <div className="space-y-4">
        {/* Hero com estatísticas */}
        <div className="ep-hero">
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Histórico</h2>
              <p className="text-xs text-muted-foreground">
                {logs.length} registro(s) totais
              </p>
            </div>
            <button
              onClick={limpar}
              disabled={busy || logs.length === 0}
              className="h-9 px-3 rounded-lg bg-destructive/15 text-destructive text-sm font-medium flex items-center gap-2 disabled:opacity-40 hover:bg-destructive/25 transition"
            >
              <Trash2 className="size-4" /> Limpar
            </button>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-background/40 border border-border/70 p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <CheckCircle2 className="size-3 text-green-500" /> Enviadas
              </div>
              <div className="text-2xl font-bold text-green-500 mt-1">
                {enviadas}
              </div>
            </div>
            <div className="rounded-lg bg-background/40 border border-border/70 p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <XCircle className="size-3 text-destructive" /> Falhas
              </div>
              <div className="text-2xl font-bold text-destructive mt-1">
                {falhas}
              </div>
            </div>
          </div>
        </div>

        {q.isLoading && (
          <div className="text-center text-sm text-muted-foreground py-6">
            Carregando…
          </div>
        )}

        {!q.isLoading && logs.length === 0 && (
          <div className="ep-card text-center py-10">
            <Inbox className="size-8 mx-auto text-muted-foreground/50" />
            <div className="mt-2 text-sm text-muted-foreground">
              Nenhuma notificação enviada ainda.
            </div>
          </div>
        )}

        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="ep-list-row items-start">
              <div
                className={`size-9 rounded-lg grid place-items-center shrink-0 ${
                  l.sucesso
                    ? "bg-green-500/10 text-green-500"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {l.sucesso ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <XCircle className="size-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-primary">
                    {l.tipo_codigo}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(l.enviado_em).toLocaleString("pt-BR")}
                  </div>
                </div>
                {l.titulo && (
                  <div className="text-sm font-medium mt-0.5">{l.titulo}</div>
                )}
                {l.corpo && (
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {l.corpo}
                  </div>
                )}
                {!l.sucesso && l.erro && (
                  <div className="mt-1 text-xs text-destructive break-words">
                    {l.erro}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
