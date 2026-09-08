import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput, TextArea } from "@/components/Field";
import { actions, useFullStore } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { BRL } from "@/lib/calc";
import { Plus, X, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/abastecimentos")({
  head: () => ({
    meta: [
      { title: "Abastecimentos — Entrega Pro" },
      { name: "description", content: "Abastecimentos registrados com litros, valor pago e consumo do veículo." },
      { property: "og:title", content: "Abastecimentos — Entrega Pro" },
      { property: "og:description", content: "Abastecimentos registrados com litros, valor pago e consumo do veículo." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/abastecimentos" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/abastecimentos" }],
  }),
  component: AbastPage,
});

function AbastPage() {
  const state = useFullStore();
  const [open, setOpen] = useState(false);
  const lista = [...state.abastecimentos].sort((a, b) => (a.data > b.data ? -1 : 1));
  const totalLitros = lista.reduce((s, a) => s + (a.litros ?? 0), 0);
  const totalValor = lista.reduce((s, a) => s + (a.valor_total ?? 0), 0);

  function remover(id: string) {
    if (!confirm("Excluir abastecimento?")) return;
    actions.deleteAbastecimento(id);
    toast.success("Excluído");
  }

  return (
    <AppShell
      title="Abastecimentos"
      back="/mais"
      right={
        <button onClick={() => setOpen(true)} className="text-primary" aria-label="Novo">
          <Plus className="size-5" />
        </button>
      }
    >
      <div className="space-y-3">
        {lista.length === 0 && (
          <div className="ep-card text-center text-sm text-muted-foreground">
            Nenhum abastecimento cadastrado.
          </div>
        )}
        {lista.map((a) => {
          const preco = a.litros > 0 ? a.valor_total / a.litros : 0;
          return (
            <div key={a.id} className="ep-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">
                    {new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}
                  </div>
                  <div className="text-sm text-muted-foreground">{a.posto || "—"}</div>
                  {a.km != null && (
                    <div className="text-xs text-muted-foreground">
                      KM: {a.km.toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm">{a.litros.toFixed(2)} L</div>
                  <div className="font-semibold ep-money-neg">{BRL(a.valor_total)}</div>
                  <div className="text-xs text-muted-foreground">
                    {BRL(preco)} / L
                  </div>
                </div>
              </div>
              {a.observacao && (
                <div className="text-xs text-muted-foreground mt-2">{a.observacao}</div>
              )}
              <button
                onClick={() => remover(a.id)}
                className="mt-2 text-xs flex items-center gap-1 text-destructive"
              >
                <Trash2 className="size-3" /> Excluir
              </button>
            </div>
          );
        })}
      </div>

      {lista.length > 0 && (
        <div className="ep-card mt-4 grid grid-cols-2 gap-3">
          <div>
            <div className="ep-label">Total de litros</div>
            <div className="text-lg font-bold">{totalLitros.toFixed(2)} L</div>
          </div>
          <div className="text-right">
            <div className="ep-label">Total gasto</div>
            <div className="text-lg font-bold ep-money-neg">{BRL(totalValor)}</div>
          </div>
        </div>
      )}

      {open && <NovoModal onClose={() => setOpen(false)} />}
    </AppShell>
  );
}

function NovoModal({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({
    data: new Date().toISOString().slice(0, 10),
    posto: "",
    km: "",
    litros: "",
    valor_total: "",
    observacao: "",
  });

  function save(e: React.FormEvent) {
    e.preventDefault();
    const litros = Number(f.litros.replace(",", "."));
    const valor = Number(f.valor_total.replace(",", "."));
    if (!f.data || !Number.isFinite(litros) || litros <= 0 || !Number.isFinite(valor) || valor <= 0) {
      toast.error("Preencha data, litros e valor");
      return;
    }
    actions.addAbastecimento({
      data: f.data,
      posto: f.posto.trim().slice(0, 60),
      km: f.km ? Number(f.km) : undefined,
      litros,
      valor_total: valor,
      observacao: f.observacao.slice(0, 200),
    });
    toast.success("Abastecimento salvo");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-end sm:place-items-center p-0 sm:p-4">
      <form
        onSubmit={save}
        className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Novo Abastecimento</h2>
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
        <Field label="Posto">
          <TextInput
            value={f.posto}
            onChange={(e) => setF({ ...f, posto: e.target.value })}
            maxLength={60}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="KM do veículo">
            <TextInput
              type="number"
              inputMode="decimal"
              value={f.km}
              onChange={(e) => setF({ ...f, km: e.target.value })}
            />
          </Field>
          <Field label="Litros">
            <TextInput
              type="number"
              inputMode="decimal"
              step="0.01"
              value={f.litros}
              onChange={(e) => setF({ ...f, litros: e.target.value })}
              required
            />
          </Field>
        </div>
        <Field label="Valor total (R$)">
          <TextInput
            type="number"
            inputMode="decimal"
            step="0.01"
            value={f.valor_total}
            onChange={(e) => setF({ ...f, valor_total: e.target.value })}
            required
          />
        </Field>
        <Field label="Observação">
          <TextArea
            value={f.observacao}
            onChange={(e) => setF({ ...f, observacao: e.target.value })}
            maxLength={200}
          />
        </Field>
        <button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold">
          Salvar
        </button>
      </form>
    </div>
  );
}
