import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Field, TextInput } from "@/components/Field";
import { Textarea } from "@/components/ui/textarea";
import { broadcastNotification } from "@/lib/notifications/broadcast.functions";
import { Megaphone, Send, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/mensagens")({
  head: () => ({
    meta: [
      { title: "Mensagem para usuários — Admin" },
      {
        name: "description",
        content: "Envie um aviso por notificação para todos os usuários do Entrega Pro.",
      },
    ],
  }),
  component: MensagensAdminPage,
});

type Resultado = {
  ok: boolean;
  destinatarios: number;
  enviados: number;
  falhas: number;
  ignorados: number;
};

function MensagensAdminPage() {
  const enviar = useServerFn(broadcastNotification);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [sending, setSending] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !mensagem.trim()) return toast.error("Preencha título e mensagem");
    if (!confirm("Enviar esta mensagem para todos os usuários?")) return;
    setSending(true);
    setRes(null);
    try {
      const r = (await enviar({
        data: { titulo: titulo.trim(), mensagem: mensagem.trim() },
      })) as Resultado;
      setRes(r);
      if (r.enviados > 0) {
        toast.success(`Mensagem enviada para ${r.enviados} usuário(s)`);
        setTitulo("");
        setMensagem("");
      } else {
        toast.error("Nenhuma notificação foi entregue");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no envio");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="ep-card flex items-start gap-3">
        <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Megaphone className="size-5 text-primary" />
        </div>
        <div>
          <div className="font-semibold">Mensagem para todos</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            A mensagem chega como notificação push nos aparelhos registrados. Usuários que
            desativaram avisos do administrador não recebem.
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="ep-card grid gap-3">
        <Field label="Título">
          <TextInput
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={120}
            placeholder="Ex.: Nova atualização disponível"
          />
        </Field>
        <Field label="Mensagem">
          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Escreva o aviso que os usuários vão receber…"
          />
        </Field>
        <button
          type="submit"
          disabled={sending}
          className="h-11 rounded-md bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Send className="size-4" /> {sending ? "Enviando…" : "Enviar para todos"}
        </button>
      </form>

      {res && (
        <div className="ep-card grid gap-2 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            {res.enviados > 0 ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : (
              <XCircle className="size-4 text-destructive" />
            )}
            Resultado do envio
          </div>
          <Linha label="Destinatários" valor={res.destinatarios} />
          <Linha label="Entregues" valor={res.enviados} />
          <Linha label="Ignorados (sem permissão/desativado)" valor={res.ignorados} />
          <Linha label="Falhas" valor={res.falhas} />
        </div>
      )}
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{valor}</span>
    </div>
  );
}
