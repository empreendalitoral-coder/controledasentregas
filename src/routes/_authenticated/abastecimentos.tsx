import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput, TextArea } from "@/components/Field";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { actions, useFullStore } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { BRL } from "@/lib/calc";
import { Fuel, Gauge, Plus, ReceiptText, Trash2 } from "lucide-react";

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

  async function remover(id: string) {
    try {
      await actions.deleteAbastecimento(id);
      toast.success("Abastecimento excluído");
    } catch {
      toast.error("Não foi possível excluir o abastecimento");
    }
  }

  return (
    <AppShell
      title="Abastecimentos"
      back="/mais"
      right={
        <Button onClick={() => setOpen(true)} variant="ghost" size="icon" aria-label="Novo abastecimento">
          <Plus className="size-5" />
        </Button>
      }
    >
      <div className="ep-page-intro mb-4">
        <div className="ep-icon-chip shrink-0"><Fuel className="size-5" /></div>
        <div>
          <h2 className="font-display font-semibold">Controle de combustível</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Acompanhe litros, preço médio e o total investido.</p>
        </div>
      </div>

      {lista.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="ep-stat-tile"><div className="ep-label">Total de litros</div><div className="ep-value">{totalLitros.toFixed(2)} L</div></div>
          <div className="ep-stat-tile"><div className="ep-label">Total gasto</div><div className="ep-value ep-money-neg">{BRL(totalValor)}</div></div>
        </div>
      )}

      <div className="space-y-3">
        {!state.hydrated && <div className="ep-empty min-h-32"><p className="text-sm">Carregando abastecimentos...</p></div>}
        {lista.length === 0 && (
          state.hydrated && <div className="ep-empty">
            <div><Fuel className="mx-auto mb-3 size-7 text-primary" /><p className="font-medium text-foreground">Nenhum abastecimento</p><p className="mt-1 text-sm">Registre o primeiro para acompanhar seus gastos.</p></div>
          </div>
        )}
        {lista.map((a) => {
          const preco = a.litros > 0 ? a.valor_total / a.litros : 0;
          return (
            <article key={a.id} className="ep-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">
                    {new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{a.posto || "Posto não informado"}</div>
                  {a.km != null && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Gauge className="size-3.5" /> {a.km.toLocaleString("pt-BR")} km
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
               <div className="mt-3 border-t border-border pt-2">
                 <ConfirmAction title="Excluir abastecimento?" description="Esse registro será removido permanentemente." confirmLabel="Excluir" destructive onConfirm={() => remover(a.id)} trigger={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 /> Excluir</Button>} />
               </div>
             </article>
          );
        })}
      </div>

      <NovoModal open={open} onClose={() => setOpen(false)} />
    </AppShell>
  );
}

function NovoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    data: new Date().toISOString().slice(0, 10),
    posto: "",
    km: "",
    litros: "",
    valor_total: "",
    observacao: "",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const litros = Number(f.litros.replace(",", "."));
    const valor = Number(f.valor_total.replace(",", "."));
    if (!f.data || !Number.isFinite(litros) || litros <= 0 || !Number.isFinite(valor) || valor <= 0) {
      toast.error("Preencha data, litros e valor");
      return;
    }
    setSaving(true);
    try {
      await actions.addAbastecimento({
        data: f.data,
        posto: f.posto.trim().slice(0, 60),
        km: f.km ? Number(f.km) : undefined,
        litros,
        valor_total: valor,
        observacao: f.observacao.slice(0, 200),
      });
      toast.success("Abastecimento salvo");
      onClose();
    } catch {
      toast.error("Não foi possível salvar o abastecimento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-xl bg-card p-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left"><DialogTitle className="font-display flex items-center gap-2"><Fuel className="size-5 text-primary" /> Novo abastecimento</DialogTitle><DialogDescription>Informe os dados registrados na bomba.</DialogDescription></DialogHeader>
      <form
        onSubmit={save}
        className="space-y-3"
      >
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
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
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
        <Button className="h-11 w-full" type="submit" disabled={saving}><ReceiptText /> {saving ? "Salvando…" : "Salvar abastecimento"}</Button>
      </form>
      </DialogContent>
    </Dialog>
  );
}
