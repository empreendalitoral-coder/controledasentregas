import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Ban, Crown, Flag, LoaderCircle, Lock, MessageCircle, MoreVertical, Reply, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Message = Database["public"]["Tables"]["community_messages"]["Row"];
type ReportReason = "spam" | "ofensa" | "golpe" | "dados_pessoais" | "outro";
type AccessStatus = {
  premium_required: boolean;
  has_access: boolean;
  is_admin: boolean;
  premium_valid: boolean;
  transition_days_remaining: number;
  transition_ends_at: string | null;
};

const RULES = [
  "Trate todos com respeito. Ofensas, ameaças e discriminação não são permitidas.",
  "Não envie links, convites, propaganda, correntes ou mensagens repetidas.",
  "Não publique telefone, e-mail, endereço ou outros dados pessoais.",
  "Não compartilhe golpes, conteúdo ilegal ou informações que coloquem alguém em risco.",
  "Denuncie abusos e use o bloqueio quando não quiser ver mensagens de uma pessoa.",
];

export const Route = createFileRoute("/_authenticated/comunidade")({
  head: () => ({
    meta: [
      { title: "Comunidade — Entrega Pro" },
      { name: "description", content: "Converse em tempo real com outros motoristas cadastrados no Entrega Pro." },
      { property: "og:title", content: "Comunidade — Entrega Pro" },
      { property: "og:description", content: "Converse em tempo real com outros motoristas cadastrados no Entrega Pro." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/comunidade" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/comunidade" }],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [content, setContent] = useState("");
  const [replying, setReplying] = useState<Message | null>(null);
  const [reporting, setReporting] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [access, setAccess] = useState<AccessStatus | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return;
    setUserId(user.id);
    if (!user.email_confirmed_at) {
      setLoading(false);
      return;
    }
    const { data: accessRows, error: accessError } = await supabase.rpc("get_community_access_status");
    const accessStatus = accessRows?.[0] as AccessStatus | undefined;
    if (accessError || !accessStatus) {
      toast.error("Não foi possível verificar seu acesso à Comunidade.");
      setLoading(false);
      return;
    }
    setAccess(accessStatus);
    if (!accessStatus.has_access) {
      setLoading(false);
      return;
    }
    const [{ data: member }, { data: rows, error }] = await Promise.all([
      supabase.from("community_members").select("rules_accepted_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("community_messages").select("*").order("created_at", { ascending: true }).limit(200),
    ]);
    if (error) toast.error("Não foi possível carregar a Comunidade.");
    setAccepted(Boolean(member?.rules_accepted_at));
    setRulesOpen(!member?.rules_accepted_at);
    setMessages(rows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("community-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [loading, messages.length]);

  async function acceptRules() {
    if (!userId) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("community_members").upsert({ user_id: userId, rules_accepted_at: now });
    if (error) return toast.error("Não foi possível registrar o aceite das regras.");
    setAccepted(true);
    setRulesOpen(false);
    toast.success("Regras aceitas. Bem-vindo à Comunidade!");
  }

  async function sendMessage() {
    const text = content.trim();
    if (!text || !userId) return;
    setSending(true);
    const { error } = await supabase.from("community_messages").insert({
      author_id: userId,
      author_name: "",
      content: text,
      reply_to: replying?.id ?? null,
    });
    setSending(false);
    if (error) return toast.error(readCommunityError(error.message));
    setContent("");
    setReplying(null);
    await load();
  }

  async function submitReport() {
    if (!reporting || !userId) return;
    const { error } = await supabase.from("community_reports").insert({
      message_id: reporting.id,
      reporter_id: userId,
      reason: reportReason,
      details: reportDetails.trim() || null,
    });
    if (error) return toast.error(error.code === "23505" ? "Você já denunciou esta mensagem." : readCommunityError(error.message));
    setReporting(null);
    setReportDetails("");
    toast.success("Denúncia enviada para análise.");
  }

  async function block(authorId: string, authorName: string) {
    if (!userId) return;
    const { error } = await supabase.from("community_blocks").insert({ blocker_id: userId, blocked_id: authorId });
    if (error && error.code !== "23505") return toast.error("Não foi possível bloquear este participante.");
    toast.success(`${authorName} foi bloqueado.`);
    await load();
  }

  if (loading) {
    return <AppShell title="Comunidade" back="/mais"><div className="ep-empty"><LoaderCircle className="size-6 animate-spin text-primary" /><span className="mt-2 text-sm">Entrando na Comunidade…</span></div></AppShell>;
  }


  if (access?.premium_required && !access.has_access) {
    return (
      <AppShell title="Comunidade" back="/mais">
        <section className="ep-premium-cta text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/20 text-primary"><Lock className="size-7" /></div>
          <span className="ep-pro-tag mt-4"><Crown className="size-3" /> PRO</span>
          <h2 className="mt-3 text-xl font-bold">Comunidade no Premium</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Converse com outros motoristas, compartilhe experiências e participe do canal geral com um plano Premium ativo.</p>
          <Button asChild className="mt-5 w-full"><Link to="/premium"><Crown />Ver planos Premium</Link></Button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Comunidade"
      back="/mais"
      right={<Button variant="ghost" size="icon" aria-label="Ver regras" onClick={() => setRulesOpen(true)}><ShieldCheck className="size-5" /></Button>}
    >
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-success" /> Canal geral · ao vivo
      </div>

      {access?.premium_required && access.transition_days_remaining > 0 && !access.premium_valid && !access.is_admin && (
        <Link to="/premium" className="mb-3 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3">
          <Crown className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1"><div className="text-sm font-semibold">Acesso gratuito por mais {access.transition_days_remaining} dias</div><div className="text-xs text-muted-foreground">Depois, a Comunidade fará parte do Premium.</div></div>
          <span className="text-primary">›</span>
        </Link>
      )}

      {messages.length === 0 ? (
        <div className="ep-empty"><MessageCircle className="size-8 text-primary" /><strong className="mt-3 text-foreground">Comece a conversa</strong><span className="mt-1 text-sm">Compartilhe uma dica ou tire uma dúvida com outros motoristas.</span></div>
      ) : (
        <ol className="space-y-3" aria-live="polite">
          {messages.map((message) => {
            const own = message.author_id === userId;
            return (
              <li key={message.id} className={`flex gap-2 ${own ? "flex-row-reverse" : ""}`}>
                <Avatar name={message.author_name} photo={message.author_photo} />
                <article className={`min-w-0 max-w-[82%] rounded-lg border px-3 py-2 ${own ? "border-primary/30 bg-primary/10" : "border-border bg-card"}`}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{own ? "Você" : message.author_name}</div>
                      <time className="text-[10px] text-muted-foreground">{formatTime(message.created_at)}</time>
                    </div>
                    {!own && !message.removed_at && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="-mr-2 -mt-1 size-8" aria-label="Opções da mensagem"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setReplying(message)}><Reply />Responder</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setReporting(message)}><Flag />Denunciar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => void block(message.author_id, message.author_name)}><Ban />Bloquear participante</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  {message.reply_preview && (
                    <div className="mt-1.5 border-l-2 border-primary/50 pl-2 text-[11px] text-muted-foreground">
                      <strong>{message.reply_author_name}</strong><div className="truncate">{message.reply_preview}</div>
                    </div>
                  )}
                  {message.removed_at ? <p className="mt-2 text-sm italic text-muted-foreground">Mensagem removida pela moderação.</p> : <p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.content}</p>}
                </article>
              </li>
            );
          })}
        </ol>
      )}
      <div ref={bottomRef} />

      {accepted && (
        <div className="sticky bottom-16 z-20 -mx-4 mt-4 border-t border-border bg-background/95 px-4 pb-3 pt-3 backdrop-blur">
          {replying && <div className="mb-2 flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs"><Reply className="size-3.5 text-primary" /><span className="min-w-0 flex-1 truncate">Respondendo a {replying.author_name}: {replying.content}</span><Button variant="ghost" size="sm" onClick={() => setReplying(null)}>Cancelar</Button></div>}
          <div className="flex items-end gap-2">
            <Textarea aria-label="Mensagem" value={content} onChange={(event) => setContent(event.target.value)} maxLength={500} rows={2} placeholder="Escreva uma mensagem…" className="max-h-32 min-h-11 resize-none bg-card text-sm" />
            <Button size="icon" className="size-11 shrink-0" disabled={sending || !content.trim()} onClick={() => void sendMessage()} aria-label="Enviar mensagem">{sending ? <LoaderCircle className="animate-spin" /> : <Send />}</Button>
          </div>
          <div className="mt-1 text-right text-[10px] text-muted-foreground">{content.length}/500</div>
        </div>
      )}

      <RulesDialog open={rulesOpen} accepted={accepted} onOpenChange={setRulesOpen} onAccept={acceptRules} />
      <Dialog open={reporting !== null} onOpenChange={(open) => !open && setReporting(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-lg bg-card p-5">
          <DialogHeader><DialogTitle>Denunciar mensagem</DialogTitle><DialogDescription>A equipe analisará a denúncia. O autor não verá quem denunciou.</DialogDescription></DialogHeader>
          <Select value={reportReason} onValueChange={(value) => setReportReason(value as ReportReason)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="spam">Spam ou divulgação</SelectItem><SelectItem value="ofensa">Ofensa ou ameaça</SelectItem><SelectItem value="golpe">Golpe ou fraude</SelectItem><SelectItem value="dados_pessoais">Dados pessoais</SelectItem><SelectItem value="outro">Outro motivo</SelectItem></SelectContent>
          </Select>
          <Textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={300} placeholder="Detalhes opcionais" />
          <DialogFooter className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setReporting(null)}>Cancelar</Button><Button onClick={() => void submitReport()}>Enviar denúncia</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function RulesDialog({ open, accepted, onOpenChange, onAccept }: { open: boolean; accepted: boolean; onOpenChange: (open: boolean) => void; onAccept: () => Promise<void> }) {
  return <Dialog open={open} onOpenChange={(next) => accepted && onOpenChange(next)}><DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg bg-card p-5" onPointerDownOutside={(event) => !accepted && event.preventDefault()} onEscapeKeyDown={(event) => !accepted && event.preventDefault()}><DialogHeader><DialogTitle>Regras da Comunidade</DialogTitle><DialogDescription>Um espaço seguro e útil para motoristas. Leia antes de participar.</DialogDescription></DialogHeader><ol className="space-y-3 text-sm">{RULES.map((rule, index) => <li key={rule} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">{index + 1}</span><span>{rule}</span></li>)}</ol><DialogFooter>{accepted ? <Button onClick={() => onOpenChange(false)}>Fechar</Button> : <Button className="w-full" onClick={() => void onAccept()}><ShieldCheck />Li e aceito as regras</Button>}</DialogFooter></DialogContent></Dialog>;
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  return <div className="size-9 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">{photo ? <img src={photo} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-xs font-bold">{name.slice(0, 1).toUpperCase()}</span>}</div>;
}

function formatTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString() ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function readCommunityError(message: string) {
  if (message.includes("Links não são permitidos")) return "Links não são permitidos na Comunidade.";
  if (message.includes("Aguarde alguns segundos")) return "Aguarde alguns segundos antes de enviar outra mensagem.";
  if (message.includes("limite de mensagens")) return "Você atingiu o limite de mensagens desta hora.";
  if (message.includes("suspensa")) return "Sua participação na Comunidade está suspensa temporariamente.";
  if (message.includes("Confirme seu e-mail")) return "Confirme seu e-mail antes de participar da Comunidade.";
  if (message.includes("faz parte do Premium")) return "A Comunidade agora faz parte do Premium.";
  return "Não foi possível concluir esta ação.";
}