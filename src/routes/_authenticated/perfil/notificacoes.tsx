import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import {
  listNotificationSettings,
  updateNotificationPreference,
  removeDeviceById,
} from "@/lib/notifications/send.functions";
import {
  getPushStatus,
  subscribePushStatus,
  type PushStatus,
} from "@/lib/push-notifications";
import { toast } from "sonner";
import {
  Bell,
  Smartphone,
  Trash2,
  FileText,
  Send,
  Activity,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/perfil/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Entrega Pro" },
      { name: "description", content: "Preferências de notificações e avisos do Entrega Pro no seu celular." },
      { property: "og:title", content: "Notificações — Entrega Pro" },
      { property: "og:description", content: "Preferências de notificações e avisos do Entrega Pro no seu celular." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/perfil/notificacoes" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/perfil/notificacoes" }],
  }),
  component: NotifPrefsPage,
});

const CATEGORIA_LABEL: Record<string, string> = {
  operacional: "Operacional",
  financeiro: "Financeiro",
  premium: "Premium",
  admin: "Administração",
  resumo: "Resumos",
};

function NotifPrefsPage() {
  const load = useServerFn(listNotificationSettings);
  const update = useServerFn(updateNotificationPreference);
  const removeDev = useServerFn(removeDeviceById);
  const router = useRouter();

  const q = useQuery({
    queryKey: ["notif-settings"],
    queryFn: () => load(),
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [push, setPush] = useState<PushStatus>(getPushStatus());
  useEffect(() => subscribePushStatus(setPush), []);

  async function toggle(codigo: string, ativo: boolean) {
    setBusy(codigo);
    try {
      await update({ data: { tipo_codigo: codigo, ativo } });
      await q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(null);
    }
  }

  async function removerDispositivo(id: string) {
    if (!confirm("Remover este dispositivo? Ele deixará de receber notificações."))
      return;
    setBusy(id);
    try {
      await removeDev({ data: { id } });
      await q.refetch();
      toast.success("Dispositivo removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(null);
    }
  }

  const grupos = new Map<string, Array<NonNullable<typeof q.data>["tipos"][number]>>();
  for (const t of q.data?.tipos ?? []) {
    const arr = grupos.get(t.categoria) ?? [];
    arr.push(t);
    grupos.set(t.categoria, arr);
  }

  const tokenOk = Boolean(push.token);
  const permOk = push.permission === "granted";

  return (
    <AppShell title="Notificações" back="/perfil">
      <div className="space-y-5">
        {/* Hero */}
        <div className="ep-hero">
          <div className="relative z-10 flex items-start gap-3">
            <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 grid place-items-center shrink-0">
              <Bell className="size-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Central de notificações</h2>
              <p className="text-xs text-muted-foreground max-w-sm">
                Personalize o que chega no seu celular. Você pode alterar quando quiser.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-background/40 border border-border/70 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Este dispositivo
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {tokenOk ? (
                  <CheckCircle2 className="size-4 text-green-500" />
                ) : (
                  <XCircle className="size-4 text-destructive" />
                )}
                <span className="text-sm font-semibold">
                  {tokenOk ? "Conectado" : "Sem token"}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-background/40 border border-border/70 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Permissão
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {permOk ? (
                  <ShieldCheck className="size-4 text-green-500" />
                ) : (
                  <XCircle className="size-4 text-destructive" />
                )}
                <span className="text-sm font-semibold capitalize">
                  {push.permission === "unknown" ? "—" : push.permission}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Atalhos */}
        <section>
          <div className="ep-section-title">Ferramentas</div>
          <div className="grid gap-2">
            <Link to="/perfil/notificacoes/logs" className="ep-list-row">
              <div className="ep-icon-chip">
                <FileText className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Logs de notificações</div>
                <div className="text-xs text-muted-foreground">
                  Histórico de envios e falhas
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
            <Link to="/perfil/notificacoes/teste" className="ep-list-row">
              <div className="ep-icon-chip">
                <Send className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Testar notificação</div>
                <div className="text-xs text-muted-foreground">
                  Enviar para este ou todos os dispositivos
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
            <Link to="/perfil/notificacoes/diagnostico" className="ep-list-row">
              <div className="ep-icon-chip">
                <Activity className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Diagnóstico Firebase</div>
                <div className="text-xs text-muted-foreground">
                  Verificar conexão e permissões
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        {q.isLoading && (
          <div className="text-center text-sm text-muted-foreground py-6">
            Carregando…
          </div>
        )}

        {/* Preferências */}
        {[...grupos.entries()].map(([cat, tipos]) => (
          <section key={cat}>
            <div className="ep-section-title">
              {CATEGORIA_LABEL[cat] ?? cat}
            </div>
            <div className="ep-card">
              <ul className="divide-y divide-border/70">
                {tipos.map((t) => (
                  <li
                    key={t.codigo}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{t.titulo}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.descricao}
                      </div>
                    </div>
                    <button
                      disabled={busy === t.codigo}
                      onClick={() => toggle(t.codigo, !t.ativo)}
                      data-on={t.ativo ? "true" : "false"}
                      className="ep-switch shrink-0 disabled:opacity-50"
                      aria-label={t.ativo ? "Desativar" : "Ativar"}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        {/* Dispositivos */}
        <section>
          <div className="ep-section-title">
            <Smartphone className="size-3.5" /> Dispositivos conectados
          </div>
          <div className="ep-card">
            {(q.data?.dispositivos ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Nenhum dispositivo registrado ainda. Instale o app pela Play Store
                e permita notificações para começar a receber avisos.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {q.data!.dispositivos.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="ep-icon-chip">
                      <Smartphone className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium capitalize">
                        {d.plataforma}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Último uso:{" "}
                        {new Date(d.ultimo_uso).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <button
                      disabled={busy === d.id}
                      onClick={() => removerDispositivo(d.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-md disabled:opacity-50"
                      aria-label="Remover"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <button
          onClick={() => router.navigate({ to: "/perfil" })}
          className="w-full h-11 rounded-lg bg-secondary text-foreground font-medium hover:bg-secondary/80 transition"
        >
          Voltar ao perfil
        </button>
      </div>
    </AppShell>
  );
}
