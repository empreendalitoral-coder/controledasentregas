import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FeedGrid } from "@/components/FeedGrid";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Feed da Estrada — Entrega Pro" },
      { name: "description", content: "Veja e compartilhe o dia a dia de outros motoristas de entrega." },
      { property: "og:title", content: "Feed da Estrada — Entrega Pro" },
      { property: "og:description", content: "Veja e compartilhe o dia a dia de outros motoristas de entrega." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  return <AppShell title="Feed da Estrada" back="/"><Link to="/comunidade" className="mb-4 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3"><MessageCircle className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><div className="text-sm font-semibold">Bate-papo ao vivo</div><div className="text-xs text-muted-foreground">Converse agora com outros motoristas</div></div><span className="text-primary">›</span></Link><FeedGrid /></AppShell>;
}
