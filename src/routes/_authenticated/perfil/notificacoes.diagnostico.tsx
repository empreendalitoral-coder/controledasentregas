import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { getFirebaseDiagnostics } from "@/lib/notifications/admin.functions";
import { getPushStatus, subscribePushStatus, type PushStatus } from "@/lib/push-notifications";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil/notificacoes/diagnostico")({
  head: () => ({
    meta: [
      { title: "Diagnóstico Firebase — Entrega Pro" },
      { name: "description", content: "Verificação do estado do Firebase e push notifications." },
    ],
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
  const color = ok ? "text-green-500" : warn ? "text-yellow-500" : "text-destructive";
  return (
    <li className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <Icon className={`size-5 shrink-0 mt-0.5 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {detail && <div className="text-xs text-muted-foreground break-all">{detail}</div>}
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

  return (
    <AppShell title="Diagnóstico Firebase" back="/perfil/notificacoes">
      <div className="space-y-4">
        <div className="ep-card">
          <h2 className="font-semibold mb-2">Servidor</h2>
          <ul>
            <StatusRow
              label="Firebase inicializado"
              ok={Boolean(server?.firebaseInicializado)}
              detail={server?.projectId ? `Projeto: ${server.projectId}` : "Não configurado"}
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
              detail={server?.ambiente === "producao" ? "Produção" : "Desenvolvimento"}
            />
          </ul>
        </div>

        <div className="ep-card">
          <h2 className="font-semibold mb-2">Dispositivo</h2>
          <ul>
            <StatusRow
              label="Capacitor inicializado"
              ok={status.capacitorReady}
              warn={!status.isNative}
              detail={status.isNative ? "App nativo Android/iOS" : "Rodando no navegador (push indisponível)"}
            />
            <StatusRow
              label="Push Notifications habilitado"
              ok={status.pluginReady && status.permission === "granted"}
              warn={status.permission !== "granted" && status.permission !== "denied"}
              detail={`Permissão: ${status.permission}`}
            />
            <StatusRow
              label="Token válido"
              ok={tokenValido}
              detail={status.token ? `${status.token.slice(0, 32)}…` : "Sem token registrado neste dispositivo"}
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
              <StatusRow label="Último erro" ok={false} detail={status.lastError} />
            )}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
