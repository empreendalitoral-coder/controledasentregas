import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput } from "@/components/Field";
import { actions, useFullStore } from "@/lib/store";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Camera, AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Entrega Pro" },
      { name: "description", content: "Configure seu perfil, veículo e meta mensal." },
    ],
  }),
  component: PerfilPage,
});

// Rascunho em memória (fora do componente): preserva edições não salvas
// ao navegar Perfil ↔ Notificações e voltar. É limpo ao salvar ou ao
// trocar de usuário (ver efeito abaixo).
let draftMotorista: ReturnType<typeof useFullStore>["motorista"] | null = null;
let draftMeta: number | null = null;
let draftOwnerId: string | null = null;

function PerfilPage() {
  const state = useFullStore();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset do rascunho quando muda o usuário logado
  const ownerId = (state as { userId?: string | null }).userId ?? null;
  if (draftOwnerId !== ownerId) {
    draftOwnerId = ownerId;
    draftMotorista = null;
    draftMeta = null;
  }

  const [m, setM] = useState(() => draftMotorista ?? state.motorista);
  const [meta, setMeta] = useState(() => draftMeta ?? state.meta_mensal);

  // Mantém o rascunho sincronizado com o estado local para sobreviver ao unmount
  useEffect(() => {
    draftMotorista = m;
  }, [m]);
  useEffect(() => {
    draftMeta = meta;
  }, [meta]);

  function set<K extends keyof typeof m>(k: K, v: (typeof m)[K]) {
    setM((p) => ({ ...p, [k]: v }));
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) {
      toast.error("Foto muito grande (máx 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("foto", String(reader.result));
    reader.readAsDataURL(f);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!m.nome.trim()) {
      toast.error("Informe seu nome");
      return;
    }
    actions.setMotorista({ ...m, nome: m.nome.trim().slice(0, 80) });
    actions.setMeta(Math.max(0, Number(meta) || 0));
    // Limpa o rascunho após salvar
    draftMotorista = null;
    draftMeta = null;
    toast.success("Perfil salvo");
    nav({ to: "/" });
  }

  return (
    <AppShell title="Perfil" back="/">
      <form onSubmit={save} className="space-y-4">
        <div className="ep-card flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="size-20 rounded-full bg-secondary grid place-items-center overflow-hidden border border-border relative"
          >
            {m.foto ? (
              <img src={m.foto} alt="" className="size-full object-cover" />
            ) : (
              <Camera className="size-7 text-muted-foreground" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPhoto}
          />
          <div className="text-sm text-muted-foreground">
            Toque na foto para alterar
          </div>
        </div>

        <div className="ep-card grid grid-cols-1 gap-3">
          <Field label="Nome">
            <TextInput
              value={m.nome}
              onChange={(e) => set("nome", e.target.value)}
              maxLength={80}
              required
            />
          </Field>
          <Field label="Telefone">
            <TextInput
              value={m.telefone ?? ""}
              onChange={(e) => set("telefone", e.target.value)}
              maxLength={20}
              inputMode="tel"
            />
          </Field>
          <Field label="Transportadora">
            <TextInput
              value={m.transportadora ?? ""}
              onChange={(e) => set("transportadora", e.target.value)}
              maxLength={60}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Veículo">
              <TextInput
                value={m.veiculo ?? ""}
                onChange={(e) => set("veiculo", e.target.value)}
                maxLength={40}
              />
            </Field>
            <Field label="Modelo">
              <TextInput
                value={m.modelo ?? ""}
                onChange={(e) => set("modelo", e.target.value)}
                maxLength={40}
              />
            </Field>
          </div>
          <Field label="Placa">
            <TextInput
              value={m.placa ?? ""}
              onChange={(e) => set("placa", e.target.value.toUpperCase())}
              maxLength={10}
            />
          </Field>
        </div>

        <div className="ep-card">
          <Field label="Meta de lucro líquido do mês (R$)">
            <TextInput
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={meta}
              onChange={(e) => setMeta(Number(e.target.value))}
            />
          </Field>
        </div>

        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold"
        >
          Salvar
        </button>
      </form>

      <a
        href="/perfil/notificacoes"
        className="mt-4 flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border"
      >
        <div>
          <div className="font-medium text-sm">Notificações</div>
          <div className="text-xs text-muted-foreground">Ativar/desativar avisos e dispositivos</div>
        </div>
        <span className="text-muted-foreground">›</span>
      </a>

      <ZonaDePerigo />
    </AppShell>
  );
}

function ZonaDePerigo() {
  const nav = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  async function excluir() {
    if (confirmacao.trim().toUpperCase() !== "EXCLUIR") {
      toast.error('Digite "EXCLUIR" para confirmar');
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("solicitar_exclusao_conta", {
      _motivo: motivo.trim() || undefined,
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    await supabase.auth.signOut();
    toast.success("Conta marcada para exclusão. Você tem 30 dias para cancelar.");
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="mt-10 ep-card border-destructive/40 bg-destructive/5">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="size-5" />
        <h2 className="font-semibold">Zona de perigo</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Ao excluir sua conta, ela é bloqueada imediatamente e todos os seus dados
        (lançamentos, recebimentos, cartões, PIX, backups) são apagados em
        definitivo em até 30 dias. Você pode cancelar a exclusão dentro desse
        prazo.
      </p>

      {!aberto ? (
        <button
          onClick={() => setAberto(true)}
          className="mt-4 w-full h-11 rounded-lg border border-destructive/60 text-destructive font-medium flex items-center justify-center gap-2 hover:bg-destructive/10"
        >
          <Trash2 className="size-4" /> Excluir minha conta
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <Field label="Motivo (opcional, nos ajuda a melhorar)">
            <TextInput
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={200}
              placeholder="Ex: não uso mais, achei outro app..."
            />
          </Field>
          <Field label='Digite "EXCLUIR" para confirmar'>
            <TextInput
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder="EXCLUIR"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setAberto(false);
                setConfirmacao("");
                setMotivo("");
              }}
              className="h-11 rounded-lg bg-secondary text-foreground font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={excluir}
              disabled={loading || confirmacao.trim().toUpperCase() !== "EXCLUIR"}
              className="h-11 rounded-lg bg-destructive text-destructive-foreground font-semibold disabled:opacity-50"
            >
              {loading ? "Excluindo..." : "Confirmar exclusão"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
