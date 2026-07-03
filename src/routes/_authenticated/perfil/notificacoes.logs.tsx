import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { listNotificationLogs, clearNotificationLogs } from "@/lib/notifications/admin.functions";
import { toast } from "sonner";
import { Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/perfil/notificacoes/logs")({
  head: () => ({
    meta: [
      { title: "Logs de notificações — Entrega Pro" },
      { name: "description", content: "Histórico completo de notificações enviadas." },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const load = useServerFn(listNotificationLogs);
  const clear = useServerFn(clearNotificationLogs);
  const [busy, setBusy] = useState(false);

  const q = useQuery({ queryKey: ["notif-logs"], queryFn: () => load() });

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
      <div className="space-y-3">
        <div className="ep-card flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {q.data?.logs.length ?? 0} registro(s)
          </div>
          <button
            onClick={limpar}
            disabled={busy || (q.data?.logs.length ?? 0) === 0}
            className="h-9 px-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="size-4" /> Limpar
          </button>
        </div>

        {q.isLoading && (
          <div className="text-center text-sm text-muted-foreground py-6">Carregando…</div>
        )}

        {!q.isLoading && (q.data?.logs.length ?? 0) === 0 && (
          <div className="ep-card text-center text-sm text-muted-foreground py-6">
            Nenhuma notificação enviada ainda.
          </div>
        )}

        {(q.data?.logs ?? []).map((l) => (
          <div key={l.id} className="ep-card">
            <div className="flex items-start gap-2">
              {l.sucesso ? (
                <CheckCircle2 className="size-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="size-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase font-semibold text-muted-foreground">
                    {l.tipo_codigo}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(l.enviado_em).toLocaleString("pt-BR")}
                  </div>
                </div>
                {l.titulo && <div className="text-sm font-medium mt-1">{l.titulo}</div>}
                {l.corpo && <div className="text-xs text-muted-foreground">{l.corpo}</div>}
                <div className="mt-1 text-xs">
                  {l.sucesso ? (
                    <span className="text-green-500">Enviada</span>
                  ) : (
                    <span className="text-destructive">
                      Falhou{l.erro ? `: ${l.erro}` : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
