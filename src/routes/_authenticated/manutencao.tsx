import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput, TextArea } from "@/components/Field";
import { actions, useFullStore, type TipoManutencao } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { BRL } from "@/lib/calc";
import { Plus, X, Trash2 } from "lucide-react";

const TIPOS: TipoManutencao[] = [
  "Troca de óleo",
  "Pneus",
  "Freios",
  "Suspensão",
  "Lavagem",
  "Mecânica",
  "Outros",
];

export const Route = createFileRoute("/_authenticated/manutencao")({
  head: () => ({
    meta: [
      { title: "Manutenção — Entrega Pro" },
      { name: "description", content: "Histórico de manutenções do veículo." },
    ],
  }),
  component: ManutPage,
});

function ManutPage() {
  const state = useFullStore();
  const [open, setOpen] = useState(false);
  const lista = [...state.manutencoes].sort((a, b) => (a.data > b.data ? -1 : 1));
  const total = lista.reduce((s, m) => s + (m.valor ?? 0), 0);

  function remover(id: string) {
    if (!confirm("Excluir manutenção?")) return;
    actions.deleteManutencao(id);
    toast.success("Excluída");
  }

  return (
    <AppShell
      title="Manutenção"
      back="/mais"
      right={
        <button onClick={() => setOpen(true)} className="text-primary" aria-label="Nova">
          <Plus className="size-5" />
        </button>
      }
    >
      <div className="space-y-3">
        {lista.length === 0 && (
          <div className="ep-card text-center text-sm text-muted-foreground">
            Nenhuma manutenção cadastrada.
          </div>
        )}
        {lista.map((m) => (
          <div key={m.id} className="ep-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">
                  {new Date(m.data + "T00:00:00").toLocaleDateString("pt-BR")}
                </div>
                <div className="font-semibold">{m.tipo}</div>
                {m.km != null && (
                  <div className="text-xs text-muted-foreground">
                    KM: {m.km.toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
              <div className="font-bold ep-money-neg">{BRL(m.valor)}</div>
            </div>
            {m.observacao && (
              <div className="text-xs text-muted-foreground mt-2">{m.observacao}</div>
            )}
            <button
              onClick={() => remover(m.id)}
              className="mt-2 text-xs flex items-center gap-1 text-destructive"
            >
              <Trash2 className="size-3" /> Excluir
            </button>
          </div>
        ))}
      </div>

      {lista.length > 0 && (
        <div className="ep-card mt-4 text-center">
          <div className="ep-label">Total de gastos</div>
          <div className="text-xl font-bold ep-money-neg">{BRL(total)}</div>
        </div>
      )}

      {open && <NovoModal onClose={() => setOpen(false)} />}
    </AppShell>
  );
}

function NovoModal({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo: "Troca de óleo" as TipoManutencao,
    valor: "",
    km: "",
    observacao: "",
  });

  function save(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(f.valor.replace(",", "."));
    if (!f.data || !Number.isFinite(v) || v < 0) {
      toast.error("Preencha data e valor");
      return;
    }
    actions.addManutencao({
      data: f.data,
      tipo: f.tipo,
      valor: v,
      km: f.km ? Number(f.km) : undefined,
      observacao: f.observacao.slice(0, 300),
    });
    toast.success("Salvo");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-end sm:place-items-center p-0 sm:p-4">
      <form
        onSubmit={save}
        className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Nova Manutenção</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground">
            <X className="size-5" />
          </button>
        </div>
        <Field label="Data">
          <TextInput
            type="date"
            value={f.data}
            onChange={(e) => setF({ ...f, data: e.target.value })}
            required
          />
        </Field>
        <Field label="Tipo de serviço">
          <select
            value={f.tipo}
            onChange={(e) => setF({ ...f, tipo: e.target.value as TipoManutencao })}
            className="h-11 rounded-md bg-input/60 border border-border px-3 text-foreground"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)">
            <TextInput
              type="number"
              inputMode="decimal"
              step="0.01"
              value={f.valor}
              onChange={(e) => setF({ ...f, valor: e.target.value })}
              required
            />
          </Field>
          <Field label="KM do veículo">
            <TextInput
              type="number"
              inputMode="decimal"
              value={f.km}
              onChange={(e) => setF({ ...f, km: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Observação">
          <TextArea
            value={f.observacao}
            onChange={(e) => setF({ ...f, observacao: e.target.value })}
            maxLength={300}
          />
        </Field>
        <button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold">
          Salvar
        </button>
      </form>
    </div>
  );
}
