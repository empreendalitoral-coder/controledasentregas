import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Entrega Pro" },
      {
        name: "description",
        content: "Defina uma nova senha para recuperar o acesso à sua conta do Entrega Pro.",
      },
      { property: "og:title", content: "Nova senha — Entrega Pro" },
      {
        property: "og:description",
        content: "Recupere o acesso à sua conta do Entrega Pro definindo uma nova senha.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/reset-password" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),

  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      toast.success("Senha atualizada.");
      navigate({ to: "/" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form onSubmit={submit} className="ep-card w-full max-w-md space-y-3">
        <h1 className="text-xl font-bold">Defina sua nova senha</h1>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5 mb-1">
            <Lock className="size-4" /> Nova senha
          </span>
          <input
            required
            type="password"
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="ep-input"
            placeholder="mín. 6 caracteres"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          Salvar nova senha
        </button>
      </form>
    </div>
  );
}
