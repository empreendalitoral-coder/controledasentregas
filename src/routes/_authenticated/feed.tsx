import { createFileRoute } from "@tanstack/react-router";
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
  return <AppShell title="Feed da Estrada" back="/premium"><FeedGrid /></AppShell>;
}
