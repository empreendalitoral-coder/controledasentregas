import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/compress-image";
import { Camera, Crown, Heart, LoaderCircle, Lock, MessageCircle, Plus, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PrivatePhoto } from "@/components/PrivatePhoto";

type Post = { id: string; author_id: string; author_name: string; author_photo: string | null; content: string; image_path: string; created_at: string };
type Comment = { id: string; post_id: string; author_id: string; author_name: string; content: string; created_at: string };
type Access = { has_access: boolean; is_admin: boolean; premium_valid: boolean; premium_required: boolean };

export function FeedGrid() {
  const [userId, setUserId] = useState("");
  const [access, setAccess] = useState<Access | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<Record<string, { count: number; mine: boolean }>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);
  const [premiumGate, setPremiumGate] = useState(false);
  const [deleting, setDeleting] = useState<Post | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setUserId(auth.user.id);
    const { data: acc } = await supabase.rpc("get_community_access_status");
    const a = acc?.[0] as Access | undefined;
    setAccess(a ?? null);
    if (!a?.has_access) return setLoading(false);
    const { data: rows, error } = await supabase.from("feed_posts").select("id, author_id, author_name, author_photo, content, image_path, created_at").is("removed_at", null).order("created_at", { ascending: false }).limit(50);
    if (error) toast.error("Não foi possível carregar o Feed.");
    const list = (rows ?? []) as Post[];
    setPosts(list);
    const ids = list.map((p) => p.id);
    if (ids.length) {
      const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
        supabase.from("feed_likes").select("post_id, user_id").in("post_id", ids),
        supabase.from("feed_comments").select("id, post_id, author_id, author_name, content, created_at").in("post_id", ids).order("created_at"),
      ]);
      const l: Record<string, { count: number; mine: boolean }> = {};
      likeRows?.forEach((r) => { const c = l[r.post_id] ?? { count: 0, mine: false }; c.count++; if (r.user_id === auth.user?.id) c.mine = true; l[r.post_id] = c; });
      setLikes(l);
      const c: Record<string, Comment[]> = {};
      (commentRows as Comment[] | null)?.forEach((r) => { (c[r.post_id] ??= []).push(r); });
      setComments(c);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const current = posts.find((p) => p.id === openPost) ?? null;
  const canPost = Boolean(access?.premium_valid || access?.is_admin);

  async function toggleLike(post: Post) {
    const cur = likes[post.id] ?? { count: 0, mine: false };
    setLikes({ ...likes, [post.id]: { count: cur.count + (cur.mine ? -1 : 1), mine: !cur.mine } });
    const { error } = cur.mine
      ? await supabase.from("feed_likes").delete().eq("post_id", post.id).eq("user_id", userId)
      : await supabase.from("feed_likes").insert({ post_id: post.id, user_id: userId });
    if (error) { setLikes((prev) => ({ ...prev, [post.id]: cur })); toast.error("Não foi possível curtir agora."); }
  }

  async function removePost(post: Post) {
    const { error } = await supabase.from("feed_posts").delete().eq("id", post.id);
    if (error) return toast.error("Não foi possível apagar a publicação.");
    void supabase.storage.from("feed-photos").remove([post.image_path]);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    setOpenPost(null);
    setDeleting(null);
    toast.success("Publicação apagada.");
  }

  if (loading) return <section className="mb-6"><h3 className="mb-3 flex items-center gap-2 text-base font-bold"><Camera className="size-4 text-primary" />Feed da Estrada</h3><div className="ep-empty"><LoaderCircle className="size-6 animate-spin text-primary" /><span className="mt-2 text-sm">Carregando o Feed…</span></div></section>;

  if (!access?.has_access) {
    return (
      <section className="mb-6"><h3 className="mb-3 flex items-center gap-2 text-base font-bold"><Camera className="size-4 text-primary" />Feed da Estrada</h3>
        <div className="ep-empty"><Lock className="size-8 text-primary" /><strong className="mt-3 text-foreground">Entre na Comunidade primeiro</strong><span className="mt-1 text-sm">Confirme seu e-mail e aceite as regras para ver o Feed.</span><Button asChild className="mt-4"><Link to="/comunidade">Ir para a Comunidade</Link></Button></div>
      </section>
    );
  }

  return (
    <section className="mb-6"><h3 className="mb-3 flex items-center gap-2 text-base font-bold"><Camera className="size-4 text-primary" />Feed da Estrada</h3>
      <button type="button" onClick={() => (canPost ? setComposer(true) : setPremiumGate(true))} className="mb-4 flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left">
        <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="size-5" /></div>
        <div className="min-w-0 flex-1"><div className="text-sm font-semibold">Publicar meu dia a dia</div><div className="text-xs text-muted-foreground">Uma foto e um relato rápido da rota</div></div>
        {!canPost && <span className="ep-pro-tag"><Crown className="size-3" /> PRO</span>}
      </button>

      {posts.length === 0 ? (
        <div className="ep-empty"><Camera className="size-8 text-primary" /><strong className="mt-3 text-foreground">Nenhuma publicação ainda</strong><span className="mt-1 text-sm">Seja o primeiro a mostrar como foi o dia na rua.</span></div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <button key={post.id} type="button" onClick={() => setOpenPost(post.id)} className="relative aspect-square overflow-hidden rounded-md bg-secondary" aria-label={`Abrir publicação de ${post.author_name}`}>
              <PrivatePhoto bucket="feed-photos" path={post.image_path} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <Composer open={composer} onOpenChange={setComposer} userId={userId} onPosted={() => { setComposer(false); void load(); }} />

      <Dialog open={premiumGate} onOpenChange={setPremiumGate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Publicar é exclusivo do Premium</DialogTitle><DialogDescription>Todos podem ver, curtir e comentar. Para publicar fotos do seu dia a dia, assine o Premium.</DialogDescription></DialogHeader>
          <DialogFooter><Button asChild className="w-full"><Link to="/premium"><Crown />Ver planos Premium</Link></Button></DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={Boolean(current)} onOpenChange={(o) => !o && setOpenPost(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto p-0">
          {current && (() => { const post = current; const like = likes[post.id] ?? { count: 0, mine: false }; const list = comments[post.id] ?? []; return (
            <div>
              <DialogHeader className="sr-only"><DialogTitle>Publicação de {post.author_name}</DialogTitle><DialogDescription>Foto, curtidas e comentários</DialogDescription></DialogHeader>
              <header className="flex items-center gap-3 p-3 pr-12">
                {post.author_photo ? <img src={post.author_photo} alt="" className="size-9 rounded-full object-cover" /> : <div className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-semibold">{post.author_name.slice(0, 1).toUpperCase()}</div>}
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{post.author_name}</div><div className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</div></div>
                {(post.author_id === userId || access.is_admin) && <Button variant="ghost" size="icon" aria-label="Apagar publicação" onClick={() => setDeleting(post)}><Trash2 className="size-4" /></Button>}
              </header>
              <PrivatePhoto bucket="feed-photos" path={post.image_path} alt={post.content || "Foto do dia a dia"} className="max-h-[60vh] w-full bg-secondary object-contain" />
              <div className="p-3">
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => void toggleLike(post)} className="flex items-center gap-1.5 text-sm" aria-label={like.mine ? "Descurtir" : "Curtir"}><Heart className={`size-5 ${like.mine ? "fill-primary text-primary" : ""}`} />{like.count}</button>
                  <span className="flex items-center gap-1.5 text-sm"><MessageCircle className="size-5" />{list.length}</span>
                </div>
                {post.content && <p className="mt-2 whitespace-pre-wrap break-words text-sm"><strong>{post.author_name}</strong> {post.content}</p>}
                <Comments post={post} list={list} userId={userId} isAdmin={access.is_admin} onChange={(next) => setComments((prev) => ({ ...prev, [post.id]: next }))} />
              </div>
            </div>
          ); })()}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apagar publicação?</DialogTitle><DialogDescription>A foto, as curtidas e os comentários serão removidos.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="destructive" onClick={() => deleting && void removePost(deleting)}>Apagar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Comments({ post, list, userId, isAdmin, onChange }: { post: Post; list: Comment[]; userId: string; isAdmin: boolean; onChange: (next: Comment[]) => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  async function send() {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    const { data, error } = await supabase.from("feed_comments").insert({ post_id: post.id, author_id: userId, content }).select("id, post_id, author_id, author_name, content, created_at").single();
    setSending(false);
    if (error) return toast.error(readError(error.message));
    onChange([...list, data as Comment]);
    setText("");
  }
  async function remove(c: Comment) {
    const { error } = await supabase.from("feed_comments").delete().eq("id", c.id);
    if (error) return toast.error("Não foi possível apagar o comentário.");
    onChange(list.filter((x) => x.id !== c.id));
  }
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {list.length === 0 && <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>}
      {list.map((c) => (
        <div key={c.id} className="flex items-start gap-2 text-sm">
          <p className="min-w-0 flex-1 break-words"><strong>{c.author_name}</strong> {c.content}</p>
          {(c.author_id === userId || isAdmin) && <button type="button" aria-label="Apagar comentário" onClick={() => void remove(c)} className="text-muted-foreground"><X className="size-4" /></button>}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Escreva um comentário…" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm" onKeyDown={(e) => { if (e.key === "Enter") void send(); }} />
        <Button size="icon" aria-label="Enviar comentário" disabled={sending || !text.trim()} onClick={() => void send()}>{sending ? <LoaderCircle className="animate-spin" /> : <Send />}</Button>
      </div>
    </div>
  );
}

function Composer({ open, onOpenChange, userId, onPosted }: { open: boolean; onOpenChange: (o: boolean) => void; userId: string; onPosted: () => void }) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() { if (preview) URL.revokeObjectURL(preview); setPhoto(null); setPreview(null); setText(""); }

  async function pick(file?: File) {
    if (!file) return;
    try {
      const blob = await compressImage(file);
      if (preview) URL.revokeObjectURL(preview);
      setPhoto(blob); setPreview(URL.createObjectURL(blob));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível usar esta foto."); }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function publish() {
    if (!photo) return toast.error("Escolha uma foto.");
    setBusy(true);
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error: up } = await supabase.storage.from("feed-photos").upload(path, photo, { contentType: "image/jpeg" });
    if (up) { setBusy(false); return toast.error("Não foi possível enviar a foto."); }
    const { error } = await supabase.from("feed_posts").insert({ author_id: userId, content: text.trim(), image_path: path });
    setBusy(false);
    if (error) { void supabase.storage.from("feed-photos").remove([path]); return toast.error(readError(error.message)); }
    toast.success("Publicado no Feed!");
    reset();
    onPosted();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Publicar meu dia a dia</DialogTitle><DialogDescription>Nunca mostre etiquetas, nomes ou dados de clientes. Links não são permitidos.</DialogDescription></DialogHeader>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        {preview ? (
          <div className="relative"><img src={preview} alt="Prévia da foto" className="max-h-72 w-full rounded-md object-cover" /><Button size="icon" variant="secondary" className="absolute right-2 top-2" aria-label="Remover foto" onClick={() => { if (preview) URL.revokeObjectURL(preview); setPhoto(null); setPreview(null); }}><X /></Button></div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="grid aspect-video w-full place-items-center rounded-md border border-dashed border-border text-muted-foreground"><span className="flex flex-col items-center gap-2 text-sm"><Camera className="size-7 text-primary" />Escolher ou tirar foto</span></button>
        )}
        <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Como foi a rota hoje?" rows={3} />
        <DialogFooter><Button className="w-full" disabled={busy || !photo} onClick={() => void publish()}>{busy ? <LoaderCircle className="animate-spin" /> : <Send />}Publicar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function readError(message: string) {
  if (/Premium/i.test(message)) return "Publicar no Feed é exclusivo para assinantes Premium.";
  if (/Links/i.test(message)) return "Links não são permitidos na Comunidade.";
  if (/suspensa/i.test(message)) return "Sua participação está suspensa no momento.";
  return "Não foi possível salvar. Tente novamente.";
}

function timeAgo(value: string) {
  const min = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
