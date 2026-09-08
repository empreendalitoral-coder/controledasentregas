import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { getFirebaseDiagnostics } from "@/lib/notifications/admin.functions";
import {
  getPushStatus,
  subscribePushStatus,
  type PushStatus,
} from "@/lib/push-notifications";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Activity, Smartphone, Cloud } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/perfil/notificacoes/diagnostico",
)({
  head: () => ({
    meta: [
      { title: "Diagnóstico de notificações — Entrega Pro" },
      { name: "description", content: "Diagnóstico da permissão, do token e da conexão de notificações do aparelho." },
      { property: "og:title", content: "Diagnóstico de notificações — Entrega Pro" },
      { property: "og:description", content: "Diagnóstico da permissão, do token e da conexão de notificações do aparelho." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/perfil/notificacoes/diagnostico" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/perfil/notificacoes/diagnostico" }],
  }),
  component: DiagPage,
});

function StatusRow({
  label,
  ok,
  detail,
  warn,
}: {
  label: string;
  ok: boolean;
  detail?: string;
  warn?: boolean;
}) {
  const Icon = ok ? CheckCircle2 : warn ? AlertCircle : XCircle;
  const color = ok ? "text-green-500" : warn ? "text-warning" : "text-destructive";
  const bg = ok
    ? "bg-green-500/10"
    : warn
      ? "bg-warning/10"
      : "bg-destructive/10";
  return (
    <li className="flex items-start gap-3 py-3 border-b border-border/70 last:border-0">
      <div className={`size-8 rounded-lg grid place-items-center shrink-0 ${bg}`}>
        <Icon className={`size-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {detail && (
          <div className="text-xs text-muted-foreground break-all mt-0.5">
            {detail}
          </div>
        )}
      </div>
    </li>
  );
}

function DiagPage() {
  const load = useServerFn(getFirebaseDiagnostics);
  const q = useQuery({ queryKey: ["fb-diag"], queryFn: () => load() });
  const [status, setStatus] = useState<PushStatus>(getPushStatus());

  useEffect(() => subscribePushStatus(setStatus), []);

  const server = q.data;
  const tokenValido = Boolean(status.token && status.token.length > 20);
  const allOk =
    server?.firebaseInicializado &&
    server?.fcmConectado &&
    tokenValido &&
    status.permission === "granted";

  return (
    <AppShell title="Diagnóstico Firebase" back="/perfil/notificacoes">
      <div className="space-y-5">
        <div className="ep-hero">
          <div className="relative z-10 flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 grid place-items-center">
              <Activity className="size-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {allOk ? "Tudo funcionando" : "Verificação do sistema"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {allOk
                  ? "Suas notificações estão prontas para receber avisos."
                  : "Verifique os itens abaixo para receber notificações."}
              </p>
            </div>
          </div>
        </div>

        <section>
          <div className="ep-section-title">
            <Cloud className="size-3.5" /> Servidor
          </div>
          <div className="ep-card">
            <ul>
              <StatusRow
                label="Firebase inicializado"
                ok={Boolean(server?.firebaseInicializado)}
                detail={
                  server?.projectId
                    ? `Projeto: ${server.projectId}`
                    : "Não configurado"
                }
              />
              <StatusRow
                label="FCM conectado"
                ok={Boolean(server?.fcmConectado)}
                detail="Service Account autenticada no Google OAuth"
              />
              <StatusRow
                label="Ambiente"
                ok
                warn={server?.ambiente !== "producao"}
                detail={
                  server?.ambiente === "producao" ? "Produção" : "Desenvolvimento"
                }
              />
            </ul>
          </div>
        </section>

        <section>
          <div className="ep-section-title">
            <Smartphone className="size-3.5" /> Dispositivo
          </div>
          <div className="ep-card">
            <ul>
              <StatusRow
                label="Capacitor inicializado"
                ok={status.capacitorReady}
                warn={!status.isNative}
                detail={
                  status.isNative
                    ? "App nativo Android/iOS"
                    : "Rodando no navegador (push indisponível)"
                }
              />
              <StatusRow
                label="Push Notifications habilitado"
                ok={status.pluginReady && status.permission === "granted"}
                warn={
                  status.permission !== "granted" && status.permission !== "denied"
                }
                detail={`Permissão: ${status.permission}`}
              />
              <StatusRow
                label="Token válido"
                ok={tokenValido}
                detail={
                  status.token
                    ? `${status.token.slice(0, 32)}…`
                    : "Sem token registrado neste dispositivo"
                }
              />
              <StatusRow
                label="Tokens registrados na conta"
                ok={(server?.tokensRegistrados ?? 0) > 0}
                detail={`${server?.tokensRegistrados ?? 0} dispositivo(s)`}
              />
              {status.lastUpdated && (
                <StatusRow
                  label="Última atualização do token"
                  ok
                  detail={new Date(status.lastUpdated).toLocaleString("pt-BR")}
                />
              )}
              {status.lastError && (
                <StatusRow
                  label="Último erro"
                  ok={false}
                  detail={status.lastError}
                />
              )}
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
