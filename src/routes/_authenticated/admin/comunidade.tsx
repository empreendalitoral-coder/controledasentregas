import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ConfirmAction";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Flag, LoaderCircle, MessageSquareWarning, ShieldBan, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Report = Database["public"]["Tables"]["community_reports"]["Row"];
type Message = Database["public"]["Tables"]["community_messages"]["Row"];
type ReportView = Report & { message: Message | null };

export const Route = createFileRoute("/_authenticated/admin/comunidade")({
  head: () => ({ meta: [
    { title: "Moderação da Comunidade — Admin — Entrega Pro" },
    { name: "description", content: "Revisão administrativa das denúncias da Comunidade Entrega Pro." },
    { property: "og:title", content: "Moderação da Comunidade — Admin — Entrega Pro" },
    { property: "og:description", content: "Revisão administrativa das denúncias da Comunidade Entrega Pro." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://meuentregapro.app/admin/comunidade" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ], links: [{ rel: "canonical", href: "/admin/comunidade" }] }),
  component: CommunityModerationPage,
});

function CommunityModerationPage() {
  const [reports, setReports] = useState<ReportView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("community_reports").select("*, message:community_messages(*)").eq("status", "pending").order("created_at", { ascending: true });
    if (error) toast.error("Não foi possível carregar as denúncias.");
    setReports((data ?? []) as ReportView[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function finish(report: ReportView, action: "dismiss" | "remove" | "suspend") {
    setBusy(report.id);
    const { data: auth } = await supabase.auth.getUser();
    const reviewer = auth.user?.id;
    if (!reviewer) { setBusy(null); return; }
    if ((action === "remove" || action === "suspend") && report.message) {
      const { error } = await supabase.from("community_messages").update({ removed_at: new Date().toISOString(), removed_by: reviewer, removal_reason: report.reason }).eq("id", report.message.id);
      if (error) { setBusy(null); return toast.error("Não foi possível remover a mensagem."); }
    }
    if (action === "suspend" && report.message) {
      const until = new Date(Date.now() + 7 * 86400000).toISOString();
      const { error } = await supabase.from("community_members").upsert({ user_id: report.message.author_id, suspended_until: until, suspended_reason: report.reason });
      if (error) { setBusy(null); return toast.error("Não foi possível suspender o participante."); }
    }
    const { error } = await supabase.from("community_reports").update({ status: action === "dismiss" ? "dismissed" : "reviewed", reviewed_by: reviewer, reviewed_at: new Date().toISOString() }).eq("id", report.id);
    setBusy(null);
    if (error) return toast.error("Não foi possível concluir a revisão.");
    toast.success(action === "dismiss" ? "Denúncia arquivada." : action === "suspend" ? "Mensagem removida e participante suspenso por 7 dias." : "Mensagem removida.");
    await load();
  }

  return <div className="grid gap-4"><div className="ep-page-intro"><div className="ep-icon-chip"><MessageSquareWarning className="size-4" /></div><div><h2 className="font-semibold">Moderação da Comunidade</h2><p className="mt-0.5 text-xs text-muted-foreground">Revise denúncias, remova conteúdo e suspenda participantes.</p></div></div>{loading && <div className="ep-empty"><LoaderCircle className="size-6 animate-spin text-primary" /><span className="mt-2 text-sm">Carregando denúncias…</span></div>}{!loading && reports.length === 0 && <div className="ep-empty"><Flag className="size-7 text-success" /><strong className="mt-2 text-foreground">Tudo em ordem</strong><span className="mt-1 text-sm">Nenhuma denúncia aguardando análise.</span></div>}<ul className="space-y-3">{reports.map((report) => <li key={report.id} className="ep-card"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-destructive/15 px-2 py-1 text-[11px] font-semibold text-destructive">{reasonLabel(report.reason)}</span><time className="text-[10px] text-muted-foreground">{new Date(report.created_at).toLocaleString("pt-BR")}</time></div><div className="mt-3 rounded-md border border-border bg-secondary/40 p-3"><div className="text-xs font-semibold">{report.message?.author_name ?? "Mensagem indisponível"}</div><p className="mt-1 whitespace-pre-wrap break-words text-sm">{report.message?.content ?? "A mensagem não está mais disponível."}</p></div>{report.details && <p className="mt-2 text-xs text-muted-foreground">Detalhes: {report.details}</p>}<div className="mt-3 grid grid-cols-3 gap-2"><Button variant="outline" size="sm" disabled={busy === report.id} onClick={() => void finish(report, "dismiss")}>Arquivar</Button><ConfirmAction trigger={<Button variant="secondary" size="sm" disabled={busy === report.id || !report.message}><Trash2 />Remover</Button>} title="Remover esta mensagem?" description="O conteúdo será substituído por um aviso de moderação." confirmLabel="Remover" destructive onConfirm={() => finish(report, "remove")} /><ConfirmAction trigger={<Button variant="destructive" size="sm" disabled={busy === report.id || !report.message}><ShieldBan />Suspender</Button>} title="Suspender por 7 dias?" description="A mensagem será removida e o participante ficará sem publicar por 7 dias." confirmLabel="Suspender" destructive onConfirm={() => finish(report, "suspend")} /></div></li>)}</ul></div>;
}

function reasonLabel(reason: string) {
  return ({ spam: "Spam", ofensa: "Ofensa", golpe: "Golpe", dados_pessoais: "Dados pessoais", outro: "Outro" } as Record<string, string>)[reason] ?? reason;
}