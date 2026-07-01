import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Se a conta está marcada para exclusão, força a tela de conta excluída
    // (exceto quando o usuário já está nela ou saindo).
    const { data: prof } = await supabase
      .from("profiles")
      .select("excluida_em")
      .eq("id", data.user.id)
      .maybeSingle();

    if (prof?.excluida_em && location.pathname !== "/conta-excluida") {
      throw redirect({ to: "/conta-excluida" });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
