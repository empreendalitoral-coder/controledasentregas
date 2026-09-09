import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Eye, Clock } from "lucide-react";
import { BRL } from "@/lib/calc";
import { registrarLogAdmin } from "@/lib/admin-log";

type Solic = {
  id: string;
  user_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  plano: "mensal" | "anual" | "teste";
  valor: number;
  comprovante_path: string | null;
  status: "pendente" | "aprovado" | "recusado";
  created_at: string;
  observacao_admin: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/solicitacoes")({
  head: () => ({
    meta: [
      { title: "Solicitações — Admin — Entrega Pro" },
      { name: "description", content: "Solicitações de assinatura Premium aguardando aprovação." },
      { property: "og:title", content: "Solicitações — Admin — Entrega Pro" },
      { property: "og:description", content: "Solicitações de assinatura Premium aguardando aprovação." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/admin/solicitacoes" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/admin/solicitacoes" }],
  }),
  component: SolicAdminPage,
});

function SolicAdminPage() {
  const [filter, setFilter] = useState<"pendente" | "aprovado" | "recusado" | "todos">("pendente");
  const [items, setItems] = useState<Solic[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [aprovando, setAprovando] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);


  async function load() {
    let q = supabase.from("solicitacoes_premium").select("*").order("created_at", { ascending: false });
    if (filter !== "todos") q = q.eq("status", filter);
    const { data } = await q;
    if (data) setItems(data.map((d) => ({ ...d, valor: Number(d.valor) })) as Solic[]);
  }
  useEffect(() => { load(); }, [filter]);

  async function decidir(s: Solic, status: "aprovado" | "recusado", plano?: Solic["plano"]) {
    setBusy(s.id);
    setAprovando(null);
    const obs = status === "recusado" ? prompt("Motivo (opcional)") : null;
    const patch: Record<string, unknown> = { status, observacao_admin: obs };
    if (status === "aprovado" && plano && plano !== s.plano) patch["plano"] = plano;
    const { error } = await supabase
      .from("solicitacoes_premium")
      .update(patch)
      .eq("id", s.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    await registrarLogAdmin(status === "aprovado" ? "aprovacao_premium" : "recusa_premium", {
      solicitacao_id: s.id, user_id: s.user_id, plano: s.plano, valor: s.valor, observacao: obs,
    });
    if (status === "aprovado") {
      try {
        const { dispatchNotificationFn } = await import("@/lib/notifications/send.functions");
        await dispatchNotificationFn({
          data: {
            userId: s.user_id,
            tipoCodigo: "pix_aprovado",
            contexto: { plano: s.plano, valor: s.valor },
            dedupKey: `pix_aprovado:${s.id}`,
          },
        });
      } catch (e) {
        console.warn("[notif pix_aprovado] falhou", e);
      }
    }
    toast.success(status === "aprovado" ? "Premium liberado!" : "Solicitação recusada");
    load();
  }

  async function verComprovante(path: string) {
    const { data, error } = await supabase.storage.from("comprovantes").createSignedUrl(path, 120);
    if (error || !data) { toast.error("Não foi possível abrir"); return; }
    setPreview(data.signedUrl);
  }

  async function copiarContato(s: Solic) {
    const txt = s.telefone || s.email || "";
    if (!txt) return toast.error("Sem contato cadastrado");
    try {
      await navigator.clipboard.writeText(txt);
      toast.success(`Copiado: ${txt}`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <>
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 mb-3 overflow-x-auto">
        {(["pendente", "aprovado", "recusado", "todos"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`flex-1 min-w-fit h-9 px-3 rounded-md text-xs font-medium capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{f}</button>
        ))}
      </div>

      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="ep-card">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{s.nome}</div>
                <div className="text-xs text-muted-foreground truncate">{s.telefone || s.email || "—"}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Plano <span className="font-semibold capitalize text-foreground">{s.plano}</span> • {BRL(s.valor)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${s.status === "aprovado" ? "bg-success/20 text-success" : s.status === "recusado" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                {s.status}
              </span>
            </div>
            {s.observacao_admin && <p className="text-xs text-muted-foreground mt-2 italic">{s.observacao_admin}</p>}
            <div className="mt-3 flex gap-2">
              {s.comprovante_path && (
                <button onClick={() => verComprovante(s.comprovante_path!)} className="h-10 px-3 rounded-md bg-secondary text-sm flex items-center gap-1"><Eye className="size-4" /> Ver</button>
              )}
              {(s.telefone || s.email) && (
                <button onClick={() => copiarContato(s)} className="h-10 px-3 rounded-md bg-secondary text-sm flex items-center gap-1"><Copy className="size-4" /> Contato</button>
              )}
              {s.status === "pendente" && (
                <>
                  <button disabled={busy === s.id} onClick={() => setAprovando(aprovando === s.id ? null : s.id)} className="flex-1 h-10 rounded-md bg-success text-success-foreground font-semibold text-sm flex items-center justify-center gap-1 disabled:opacity-50">
                    {busy === s.id ? <Clock className="size-4 animate-spin" /> : <Check className="size-4" />} Aprovar
                  </button>
                  <button disabled={busy === s.id} onClick={() => decidir(s, "recusado")} className="flex-1 h-10 rounded-md bg-destructive text-destructive-foreground font-semibold text-sm flex items-center justify-center gap-1 disabled:opacity-50">
                    <X className="size-4" /> Recusar
                  </button>
                </>
              )}
            </div>
            {aprovando === s.id && (
              <div className="mt-2 rounded-lg bg-secondary/60 p-2">
                <div className="text-xs text-muted-foreground mb-2">Liberar por quanto tempo?</div>
                <div className="grid grid-cols-3 gap-2">
                  {([["teste", "15 dias"], ["mensal", "30 dias"], ["anual", "1 ano"]] as const).map(([p, lbl]) => (
                    <button key={p} onClick={() => decidir(s, "aprovado", p)} className={`h-9 rounded-md text-xs font-semibold ${p === s.plano ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="text-center text-muted-foreground py-8 text-sm">Nenhuma solicitação</li>}
      </ul>
    </>
  );
}
