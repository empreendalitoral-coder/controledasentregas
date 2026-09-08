import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      // getSession lê a sessão local (instantâneo) e evita tela branca em rede lenta.
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw redirect({ to: "/auth" });

      // Verificação de conta em exclusão não pode derrubar o app se a rede falhar.
      if (location.pathname !== "/conta-excluida") {
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("excluida_em")
            .eq("id", user.id)
            .maybeSingle();
          if (prof?.excluida_em) throw redirect({ to: "/conta-excluida" });
        } catch (e) {
          if (isRedirect(e)) throw e;
          console.warn("[auth] verificação de perfil falhou", e);
        }
      }

      return { user };
    } catch (e) {
      if (isRedirect(e)) throw e;
      console.error("[auth] falha ao validar sessão", e);
      throw redirect({ to: "/auth" });
    }
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
  component: () => <Outlet />,
});
