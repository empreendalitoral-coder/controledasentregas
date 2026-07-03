import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput } from "@/components/Field";
import { Textarea } from "@/components/ui/textarea";
import { sendTestNotification } from "@/lib/notifications/admin.functions";
import { getPushStatus, subscribePushStatus, type PushStatus } from "@/lib/push-notifications";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, Smartphone, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil/notificacoes/teste")({
  head: () => ({
    meta: [
      { title: "Teste de notificações — Entrega Pro" },
      { name: "description", content: "Envie uma notificação de teste para seus dispositivos." },
    ],
  }),
  component: TestePage,
});

type Resultado = { ok: boolean; enviados: number; falhas: number; erros: string[] } | null;

function TestePage() {
  const enviar = useServerFn(sendTestNotification);
  const [titulo, setTitulo] = useState("Teste do Entrega Pro");
  const [mensagem, setMensagem] = useState("Se você viu isso, as notificações estão funcionando! ✅");
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
          token: escopo === "dispositivo" ? status.token ?? undefined : undefined,
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
      <div className="space-y-4">
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
            className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Smartphone className="size-5" />
            {busy === "dispositivo" ? "Enviando..." : "Enviar para este dispositivo"}
          </button>
          <button
            disabled={busy !== null}
            onClick={() => send("todos")}
            className="h-12 rounded-xl bg-secondary text-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Users className="size-5" />
            {busy === "todos" ? "Enviando..." : "Enviar para todos os meus dispositivos"}
          </button>
        </div>

        {!status.token && (
          <div className="ep-card text-xs text-muted-foreground">
            <Send className="size-4 inline mr-1" />
            Este dispositivo ainda não registrou um token FCM. Abra o app pela versão Android
            nativa e conceda permissão de notificações para começar a testar.
          </div>
        )}

        {resultado && (
          <div className="ep-card">
            <div className="text-sm font-semibold mb-2">Resultado</div>
            <div className="text-sm">
              <div>
                Enviados: <span className="font-medium text-green-500">{resultado.enviados}</span>
              </div>
              <div>
                Falhas: <span className="font-medium text-destructive">{resultado.falhas}</span>
              </div>
            </div>
            {resultado.erros.length > 0 && (
              <ul className="mt-2 text-xs text-destructive space-y-1">
                {resultado.erros.map((e, i) => (
                  <li key={i} className="break-words">{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
