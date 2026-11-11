import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({ meta: [
    { title: "Enviar sugestão — Entrega Pro" },
    { name: "description", content: "Conte o que falta ou o que pode melhorar no Entrega Pro." },
    { property: "og:title", content: "Enviar sugestão — Entrega Pro" },
    { property: "og:description", content: "Conte o que falta ou o que pode melhorar no Entrega Pro." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Feedback,
});

function Feedback() {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const enviar = async () => {
    const t = msg.trim();
    if (t.length < 3) { toast.error("Escreva pelo menos algumas palavras."); return; }
    setSending(true);
    const { error } = await supabase.from("feedbacks").insert({ mensagem: t });
    setSending(false);
    if (error) { toast.error("Não foi possível enviar. Tente de novo."); return; }
    setMsg("");
    toast.success("Obrigado! Sua sugestão foi enviada.");
  };
  return (
    <AppShell title="Enviar sugestão">
      <div className="ep-card space-y-3">
        <p className="text-sm text-muted-foreground">O que está faltando, o que não ficou claro ou o que faria você usar mais o app?</p>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={1000} rows={6}
          className="w-full rounded-md border border-border bg-background p-3 text-sm" placeholder="Escreva aqui..." />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{msg.length}/1000</span>
          <Button onClick={enviar} disabled={sending}>{sending ? "Enviando..." : "Enviar"}</Button>
        </div>
      </div>
    </AppShell>
  );
}
