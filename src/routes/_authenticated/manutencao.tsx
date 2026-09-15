import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput, TextArea } from "@/components/Field";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actions, useFullStore, type TipoManutencao } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { BRL } from "@/lib/calc";
import { Gauge, Plus, ReceiptText, Trash2, Wrench } from "lucide-react";

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
      { name: "description", content: "Histórico de manutenções do veículo com custos e quilometragem." },
      { property: "og:title", content: "Manutenção — Entrega Pro" },
      { property: "og:description", content: "Histórico de manutenções do veículo com custos e quilometragem." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/manutencao" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/manutencao" }],
  }),
  component: ManutPage,
});

function ManutPage() {
  const state = useFullStore();
  const [open, setOpen] = useState(false);
  const lista = [...state.manutencoes].sort((a, b) => (a.data > b.data ? -1 : 1));
  const total = lista.reduce((s, m) => s + (m.valor ?? 0), 0);

  function remover(id: string) {
    actions.deleteManutencao(id);
    toast.success("Manutenção excluída");
  }

  return (
    <AppShell
      title="Manutenção"
      back="/mais"
      right={
        <Button onClick={() => setOpen(true)} variant="ghost" size="icon" aria-label="Nova manutenção">
          <Plus className="size-5" />
        </Button>
      }
    >
      <div className="ep-page-intro mb-4"><div className="ep-icon-chip shrink-0"><Wrench className="size-5" /></div><div><h2 className="font-display font-semibold">Cuidados com o veículo</h2><p className="mt-0.5 text-sm text-muted-foreground">Organize serviços, quilometragem e custos.</p></div></div>
      {lista.length > 0 && <div className="ep-stat-tile mb-4"><div className="ep-label">Total investido em manutenção</div><div className="ep-value ep-money-neg">{BRL(total)}</div></div>}
      <div className="space-y-3">
        {lista.length === 0 && (
          <div className="ep-empty"><div><Wrench className="mx-auto mb-3 size-7 text-primary" /><p className="font-medium text-foreground">Nenhuma manutenção</p><p className="mt-1 text-sm">Adicione um serviço para manter o histórico organizado.</p></div></div>
        )}
        {lista.map((m) => (
          <article key={m.id} className="ep-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">
                  {new Date(m.data + "T00:00:00").toLocaleDateString("pt-BR")}
                </div>
                <div className="font-semibold">{m.tipo}</div>
                {m.km != null && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Gauge className="size-3.5" /> {m.km.toLocaleString("pt-BR")} km
                  </div>
                )}
              </div>
              <div className="font-bold ep-money-neg">{BRL(m.valor)}</div>
            </div>
            {m.observacao && (
              <div className="text-xs text-muted-foreground mt-2">{m.observacao}</div>
            )}
            <div className="mt-3 border-t border-border pt-2"><ConfirmAction title="Excluir manutenção?" description="Esse serviço será removido permanentemente." confirmLabel="Excluir" destructive onConfirm={() => remover(m.id)} trigger={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 /> Excluir</Button>} /></div>
          </article>
        ))}
      </div>

      <NovoModal open={open} onClose={() => setOpen(false)} />
    </AppShell>
  );
}

function NovoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-xl bg-card p-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left"><DialogTitle className="font-display flex items-center gap-2"><Wrench className="size-5 text-primary" /> Nova manutenção</DialogTitle><DialogDescription>Registre o serviço realizado no veículo.</DialogDescription></DialogHeader>
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
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
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
        <Button className="h-11 w-full" type="submit"><ReceiptText /> Salvar manutenção</Button>
      </form>
      </DialogContent>
    </Dialog>
  );
}
