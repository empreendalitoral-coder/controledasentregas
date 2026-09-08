import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput } from "@/components/Field";
import { Textarea } from "@/components/ui/textarea";
import { sendTestNotification } from "@/lib/notifications/admin.functions";
import {
  getPushStatus,
  subscribePushStatus,
  type PushStatus,
} from "@/lib/push-notifications";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, Smartphone, Users, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil/notificacoes/teste")({
  head: () => ({
    meta: [
      { title: "Teste de notificações — Entrega Pro" },
      { name: "description", content: "Envie uma notificação de teste para conferir se o aparelho está recebendo." },
      { property: "og:title", content: "Teste de notificações — Entrega Pro" },
      { property: "og:description", content: "Envie uma notificação de teste para conferir se o aparelho está recebendo." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/perfil/notificacoes/teste" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/perfil/notificacoes/teste" }],
  }),
  component: TestePage,
});

type Resultado = {
  ok: boolean;
  enviados: number;
  falhas: number;
  erros: string[];
} | null;

function TestePage() {
  const enviar = useServerFn(sendTestNotification);
  const [titulo, setTitulo] = useState("Teste do Entrega Pro");
  const [mensagem, setMensagem] = useState(
    "Se você viu isso, as notificações estão funcionando! ✅",
  );
  const [busy, setBusy] = useState<"dispositivo" | "todos" | null>(null);
  const [resultado, setResultado] = useState<Resultado>(null);
  const [status, setStatus] = useState<PushStatus>(getPushStatus());

  useEffect(() => subscribePushStatus(setStatus), []);

  async function send(escopo: "dispositivo" | "todos") {
    if (!titulo.trim() || !mensagem.trim()) {
      toast.error("Preencha título e mensagem");
      return;
    }
    if (escopo === "dispositivo" && !status.token) {
      toast.error("Este dispositivo ainda não tem token FCM registrado");
      return;
    }
    setBusy(escopo);
    setResultado(null);
    try {
      const r = await enviar({
        data: {
          titulo: titulo.trim(),
          mensagem: mensagem.trim(),
          escopo,
          token:
            escopo === "dispositivo" ? (status.token ?? undefined) : undefined,
        },
      });
      setResultado(r);
      if (r.ok) toast.success(`Enviada para ${r.enviados} dispositivo(s)`);
      else toast.error("Falha ao enviar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell title="Teste de notificações" back="/perfil/notificacoes">
      <div className="space-y-5">
        {/* Hero preview */}
        <div className="ep-hero">
          <div className="relative z-10">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Pré-visualização
            </div>
            <div className="mt-2 rounded-xl bg-background/60 border border-border/70 p-3 flex gap-3">
              <div className="size-10 rounded-lg bg-primary/20 grid place-items-center shrink-0">
                <Send className="size-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  {titulo || "Título da notificação"}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {mensagem || "Corpo da notificação aparecerá aqui."}
                </div>
                <div className="text-[10px] text-muted-foreground/70 mt-1">
                  Entrega Pro · agora
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ep-card space-y-3">
          <Field label="Título">
            <TextInput
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
            />
          </Field>
          <Field label="Mensagem">
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </Field>
        </div>

        <div className="grid gap-2">
          <button
            disabled={busy !== null || !status.token}
            onClick={() => send("dispositivo")}
            className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20 hover:brightness-110 transition"
          >
            <Smartphone className="size-5" />
            {busy === "dispositivo"
              ? "Enviando..."
              : "Enviar para este dispositivo"}
          </button>
          <button
            disabled={busy !== null}
            onClick={() => send("todos")}
            className="h-12 rounded-xl bg-secondary text-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-secondary/80 transition"
          >
            <Users className="size-5" />
            {busy === "todos"
              ? "Enviando..."
              : "Enviar para todos os meus dispositivos"}
          </button>
        </div>

        {!status.token && (
          <div className="ep-card border-warning/40 bg-warning/5 flex gap-3">
            <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              Este dispositivo ainda não registrou um token FCM. Abra o app pela
              versão Android nativa e conceda permissão de notificações para
              começar a testar.
            </div>
          </div>
        )}

        {resultado && (
          <div className="ep-card">
            <div className="text-sm font-semibold mb-3">Resultado do envio</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <CheckCircle2 className="size-3 text-green-500" /> Enviados
                </div>
                <div className="text-2xl font-bold text-green-500 mt-1">
                  {resultado.enviados}
                </div>
              </div>
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <XCircle className="size-3 text-destructive" /> Falhas
                </div>
                <div className="text-2xl font-bold text-destructive mt-1">
                  {resultado.falhas}
                </div>
              </div>
            </div>
            {resultado.erros.length > 0 && (
              <ul className="mt-3 text-xs text-destructive space-y-1">
                {resultado.erros.map((e, i) => (
                  <li key={i} className="break-words">
                    · {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
