import { createFileRoute } from "@tanstack/react-router";
import { feedExpiryCutoff } from "@/lib/feed-expiry";

export const Route = createFileRoute("/api/public/hooks/limpar-feed")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cutoff = feedExpiryCutoff();
        const { data: posts, error } = await supabaseAdmin.from("feed_posts")
          .select("id, image_path").lte("created_at", cutoff)
          .order("created_at").limit(100);
        if (error) return Response.json({ ok: false }, { status: 500 });
        let deleted = 0;
        let failed = 0;
        for (const post of posts ?? []) {
          // Keep the database row on Storage failure so the next run can retry.
          const { error: photoError } = await supabaseAdmin.storage.from("feed-photos").remove([post.image_path]);
          if (photoError) { failed++; continue; }
          const { error: postError } = await supabaseAdmin.from("feed_posts").delete()
            .eq("id", post.id).lte("created_at", cutoff);
          if (postError) failed++;
          else deleted++;
        }
        return Response.json({ ok: failed === 0, deleted, failed }, { status: failed ? 500 : 200 });
      },
    },
  },
});