import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput } from "@/components/Field";
import { actions, useFullStore } from "@/lib/store";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Entrega Pro" },
      { name: "description", content: "Configure seu perfil, veículo e meta mensal." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const state = useFullStore();
  const nav = useNavigate();
  const [m, setM] = useState(state.motorista);
  const [meta, setMeta] = useState(state.meta_mensal);
  const fileRef = useRef<HTMLInputElement>(null);

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
    </AppShell>
  );
}
