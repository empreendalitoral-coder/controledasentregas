import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Undo2, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/conta-excluida")({
  head: () => ({
    meta: [{ title: "Conta em exclusão — Entrega Pro" }],
  }),
  component: ContaExcluidaPage,
});

function ContaExcluidaPage() {
  const nav = useNavigate();
  const [purgeEm, setPurgeEm] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("contas_excluidas")
      .select("purge_em")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.purge_em) setPurgeEm(new Date(data.purge_em));
      });
  }, []);

  async function cancelar() {
    setLoading(true);
    const { error } = await supabase.rpc("cancelar_exclusao_conta");
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Exclusão cancelada. Bem-vindo de volta!");
    nav({ to: "/", replace: true });
  }

  async function sair() {
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-md w-full ep-card border-destructive/40 text-center">
        <AlertTriangle className="size-12 text-destructive mx-auto" />
        <h1 className="mt-3 text-xl font-bold">Sua conta está em processo de exclusão</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você solicitou a exclusão da sua conta. Todos os dados serão apagados em
          definitivo em{" "}
          <strong className="text-foreground">
            {purgeEm ? purgeEm.toLocaleDateString("pt-BR") : "até 30 dias"}
          </strong>
          . Enquanto isso, o acesso está bloqueado.
        </p>

        <p className="mt-4 text-sm">
          Mudou de ideia? Você ainda pode cancelar e voltar a usar o Entrega Pro
          normalmente.
        </p>

        <div className="mt-6 grid gap-2">
          <button
            onClick={cancelar}
            disabled={loading}
            className="h-12 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Undo2 className="size-4" />
            {loading ? "Cancelando..." : "Cancelar exclusão"}
          </button>
          <button
            onClick={sair}
            className="h-11 rounded-lg bg-secondary text-foreground font-medium flex items-center justify-center gap-2"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}
