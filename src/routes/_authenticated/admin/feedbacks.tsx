import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/feedbacks")({
  head: () => ({ meta: [
    { title: "Sugestões dos motoristas — Entrega Pro" },
    { name: "description", content: "Sugestões enviadas pelos motoristas." },
    { property: "og:title", content: "Sugestões dos motoristas — Entrega Pro" },
    { property: "og:description", content: "Sugestões enviadas pelos motoristas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Feedbacks,
});

type F = { id: string; mensagem: string; created_at: string };
function Feedbacks() {
  const [itens, setItens] = useState<F[] | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    supabase.from("feedbacks").select("id,mensagem,created_at").order("created_at", { ascending: false }).limit(200)
      .then(({ data, error }) => { if (error) setErro(true); else setItens(data ?? []); });
  }, []);
  if (erro) return <p className="text-sm text-destructive">Não foi possível carregar as sugestões.</p>;
  if (!itens) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (itens.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma sugestão ainda.</p>;
  return (
    <div className="space-y-2">
      {itens.map((f) => (
        <div key={f.id} className="ep-card">
          <div className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString("pt-BR")}</div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{f.mensagem}</p>
        </div>
      ))}
    </div>
  );
}
