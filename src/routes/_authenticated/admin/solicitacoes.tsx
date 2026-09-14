import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Eye, Clock, Copy, FileCheck, LoaderCircle } from "lucide-react";
import { BRL } from "@/lib/calc";
import { registrarLogAdmin } from "@/lib/admin-log";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Solic | null>(null);
  const [reason, setReason] = useState("");


  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let q = supabase.from("solicitacoes_premium").select("*").order("created_at", { ascending: false });
    if (filter !== "todos") q = q.eq("status", filter);
    const { data, error: loadError } = await q;
    if (loadError) setError("Não foi possível carregar as solicitações.");
    if (data) setItems(data.map((d) => ({ ...d, valor: Number(d.valor) })) as Solic[]);
    setLoading(false);
  }, [filter]);
  useEffect(() => { void load(); }, [load]);

  async function decidir(s: Solic, status: "aprovado" | "recusado", plano?: Solic["plano"], obs: string | null = null) {
    setBusy(s.id);
    setAprovando(null);
    const novoPlano = status === "aprovado" && plano ? plano : s.plano;
    const { error } = await supabase
      .from("solicitacoes_premium")
      .update({ status, observacao_admin: obs, plano: novoPlano })
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
    setRejecting(null);
    setReason("");
    await load();
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
      <div className="ep-page-intro mb-4"><div className="ep-icon-chip"><FileCheck className="size-4" /></div><div><h2 className="font-semibold">Solicitações Premium</h2><p className="text-xs text-muted-foreground mt-0.5">Revise pagamentos e libere o período correto.</p></div></div>
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 mb-3 overflow-x-auto">
        {(["pendente", "aprovado", "recusado", "todos"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`flex-1 min-w-fit h-9 px-3 rounded-md text-xs font-medium capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{f}</button>
        ))}
      </div>

      {loading && <div className="ep-empty"><LoaderCircle className="size-6 animate-spin text-primary" /><span className="mt-2 text-sm">Carregando solicitações…</span></div>}
      {error && <div className="ep-empty"><span className="text-sm">{error}</span><Button className="mt-3" variant="secondary" onClick={() => void load()}>Tentar novamente</Button></div>}
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
                <Button onClick={() => s.comprovante_path && verComprovante(s.comprovante_path)} variant="secondary"><Eye className="size-4" /> Ver</Button>
              )}
              {(s.telefone || s.email) && (
                <Button onClick={() => copiarContato(s)} variant="secondary"><Copy className="size-4" /> Contato</Button>
              )}
              {s.status === "pendente" && (
                <>
                  <Button disabled={busy === s.id} onClick={() => setAprovando(aprovando === s.id ? null : s.id)} className="flex-1 bg-success text-success-foreground hover:bg-success/90">
                    {busy === s.id ? <Clock className="size-4 animate-spin" /> : <Check className="size-4" />} Aprovar
                  </Button>
                  <Button disabled={busy === s.id} onClick={() => { setRejecting(s); setReason(""); }} variant="destructive" className="flex-1">
                    <X className="size-4" /> Recusar
                  </Button>
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
        {!loading && !error && items.length === 0 && <li className="ep-empty text-sm">Nenhuma solicitação nesta situação.</li>}
      </ul>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 size-10 rounded-full bg-secondary grid place-items-center" onClick={() => setPreview(null)}>
            <X className="size-5" />
          </button>
          <img src={preview} alt="Comprovante de pagamento" className="max-h-full max-w-full object-contain rounded-lg" />
        </div>
      )}
      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-xl bg-card p-5">
          <DialogHeader><DialogTitle>Recusar solicitação?</DialogTitle><DialogDescription>Você pode informar o motivo que será registrado para esta decisão.</DialogDescription></DialogHeader>
          <textarea className="ep-input min-h-24 py-3" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Motivo opcional" />
          <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:space-x-0">
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={!rejecting || busy !== null} onClick={() => rejecting && decidir(rejecting, "recusado", undefined, reason.trim() || null)}>Recusar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
