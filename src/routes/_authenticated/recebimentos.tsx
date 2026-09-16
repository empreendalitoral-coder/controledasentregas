import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput, TextArea } from "@/components/Field";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actions, useFullStore, type Recebimento } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { BRL, computeResumo, rangeFromStrings } from "@/lib/calc";
import { CalendarCheck, CircleDollarSign, Plus, Trash2, WalletCards } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recebimentos")({
  head: () => ({
    meta: [
      { title: "Recebimentos — Entrega Pro" },
      { name: "description", content: "Períodos de pagamento, valores pendentes, atrasados e já recebidos." },
      { property: "og:title", content: "Recebimentos — Entrega Pro" },
      { property: "og:description", content: "Períodos de pagamento, valores pendentes, atrasados e já recebidos." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/recebimentos" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/recebimentos" }],
  }),
  component: RecebimentosPage,
});

function fmt(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

function RecebimentosPage() {
  const state = useFullStore();
  const [tab, setTab] = useState<"pendentes" | "recebidos">("pendentes");
  const [open, setOpen] = useState(false);
  const [recebendo, setRecebendo] = useState<Recebimento | null>(null);

  const lista = state.recebimentos
    .filter((r) => (tab === "pendentes" ? r.status === "pendente" : r.status === "recebido"))
    .sort(
      (a, b) =>
        new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime(),
    );

  const totalPend = state.recebimentos
    .filter((r) => r.status === "pendente")
    .reduce((s, r) => {
      const x = computeResumo(state, rangeFromStrings(r.data_inicial, r.data_final));
      return s + (x.valor_bruto - x.descontos - x.combustivel);
    }, 0);

  const totalReceb = state.recebimentos
    .filter((r) => r.status === "recebido")
    .reduce((s, r) => s + (r.valor_recebido ?? 0), 0);

  async function remover(id: string) {
    try {
      await actions.deleteRecebimento(id);
      toast.success("Período excluído");
    } catch {
      toast.error("Não foi possível excluir o período");
    }
  }

  return (
    <AppShell
      title="Recebimentos"
      right={
        <Button
          onClick={() => setOpen(true)}
          aria-label="Novo recebimento"
          variant="ghost"
          size="icon"
        >
          <Plus className="size-5" />
        </Button>
      }
    >
      <div className="ep-page-intro mb-4"><div className="ep-icon-chip shrink-0"><WalletCards className="size-5" /></div><div><h2 className="font-display font-semibold">Agenda de pagamentos</h2><p className="mt-0.5 text-sm text-muted-foreground">Veja o que está pendente, atrasado ou já foi recebido.</p></div></div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="ep-stat-tile"><div className="ep-label">A receber</div><div className="ep-value text-warning">{BRL(totalPend)}</div></div>
        <div className="ep-stat-tile"><div className="ep-label">Já recebido</div><div className="ep-value ep-money-pos">{BRL(totalReceb)}</div></div>
      </div>

      <div className="ep-segmented grid-cols-2" role="tablist" aria-label="Status dos recebimentos">
          <Button
            variant={tab === "pendentes" ? "default" : "ghost"}
            onClick={() => setTab("pendentes")}
            role="tab"
            aria-selected={tab === "pendentes"}
            className="h-10"
          >
            Pendentes
          </Button>
          <Button
            variant={tab === "recebidos" ? "default" : "ghost"}
            onClick={() => setTab("recebidos")}
            role="tab"
            aria-selected={tab === "recebidos"}
            className="h-10"
          >
            Recebidos
          </Button>
      </div>

      <div className="space-y-3 mt-4">
        {!state.hydrated && <div className="ep-empty min-h-32"><p className="text-sm">Carregando recebimentos...</p></div>}
        {lista.length === 0 && (
          state.hydrated && <div className="ep-empty"><div><CircleDollarSign className="mx-auto mb-3 size-7 text-primary" /><p className="font-medium text-foreground">Nenhum recebimento {tab === "pendentes" ? "pendente" : "recebido"}</p><p className="mt-1 text-sm">Os períodos aparecerão aqui quando forem adicionados.</p></div></div>
        )}
        {lista.map((r) => {
          const resumo = computeResumo(
            state,
            rangeFromStrings(r.data_inicial, r.data_final),
          );
          const previsto = resumo.valor_bruto - resumo.descontos - resumo.combustivel;
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const diasAtraso = Math.round(
            (hoje.getTime() - new Date(r.data_pagamento + "T00:00:00").getTime()) / 86400000,
          );
          const atrasado = r.status === "pendente" && diasAtraso > 0;
          const status =
            r.status === "recebido"
              ? { txt: "Recebido", cls: "text-success" }
              : atrasado
                ? {
                    txt: `Atrasado há ${diasAtraso} ${diasAtraso === 1 ? "dia" : "dias"}`,
                    cls: "text-destructive",
                  }
                : { txt: "Pendente", cls: "text-warning" };
          return (
             <article
              key={r.id}
              className={`ep-card ${atrasado ? "border-destructive/50 bg-destructive/10" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{r.nome_periodo}</div>
                  <div className="font-semibold">
                    {fmt(r.data_inicial)} a {fmt(r.data_final)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Pagamento: {fmt(r.data_pagamento)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-medium ${status.cls}`}>{status.txt}</div>
                  <div className="text-lg font-bold ep-money-pos">
                    {BRL(r.status === "recebido" ? r.valor_recebido ?? 0 : previsto)}
                  </div>
                </div>
              </div>
              {r.status === "recebido" && r.data_recebimento && (
                <div className="text-xs text-muted-foreground mt-2">
                  Recebido em: {fmt(r.data_recebimento)}
                </div>
              )}
               <div className="flex flex-wrap gap-2 mt-3 border-t border-border pt-3">
                {r.status === "pendente" && (
                   <Button
                     onClick={() => setRecebendo(r)}
                     variant="outline"
                     className="min-w-0 flex-1 border-success/40 text-success hover:text-success"
                  >
                     <CalendarCheck />
                    Marcar como recebido
                   </Button>
                )}
                 <ConfirmAction title="Excluir período?" description="Esse recebimento será removido permanentemente." confirmLabel="Excluir" destructive onConfirm={() => remover(r.id)} trigger={<Button variant="outline" size="icon" className="border-destructive/40 text-destructive hover:text-destructive" aria-label="Excluir período"><Trash2 /></Button>} />
              </div>
             </article>
          );
        })}
      </div>

      <NovoModal open={open} onClose={() => setOpen(false)} />
      <RecebidoModal recebimento={recebendo} onClose={() => setRecebendo(null)} />
    </AppShell>
  );
}

function NovoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    nome_periodo: "",
    data_inicial: "",
    data_final: "",
    data_pagamento: "",
    observacao: "",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nome_periodo.trim() || !f.data_inicial || !f.data_final || !f.data_pagamento) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    if (f.data_final < f.data_inicial) {
      toast.error("Data final antes da inicial");
      return;
    }
    setSaving(true);
    try {
      await actions.addRecebimento({
        nome_periodo: f.nome_periodo.trim().slice(0, 60),
        data_inicial: f.data_inicial,
        data_final: f.data_final,
        data_pagamento: f.data_pagamento,
        observacao: f.observacao.slice(0, 300),
      });
      toast.success("Período criado");
      onClose();
    } catch {
      toast.error("Não foi possível criar o período");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-xl bg-card p-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left"><DialogTitle className="font-display flex items-center gap-2"><CircleDollarSign className="size-5 text-primary" /> Novo recebimento</DialogTitle><DialogDescription>Crie um período e informe quando ele deve ser pago.</DialogDescription></DialogHeader>
      <form
        onSubmit={save}
        className="space-y-3"
      >
        <Field label="Nome do período">
          <TextInput
            value={f.nome_periodo}
            onChange={(e) => setF({ ...f, nome_periodo: e.target.value })}
            placeholder="Ex: 1ª quinzena de junho"
            maxLength={60}
            required
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
          <Field label="Data inicial">
            <TextInput
              type="date"
              value={f.data_inicial}
              onChange={(e) => setF({ ...f, data_inicial: e.target.value })}
              required
            />
          </Field>
          <Field label="Data final">
            <TextInput
              type="date"
              value={f.data_final}
              onChange={(e) => setF({ ...f, data_final: e.target.value })}
              required
            />
          </Field>
        </div>
        <Field label="Data prevista de pagamento">
          <TextInput
            type="date"
            value={f.data_pagamento}
            onChange={(e) => setF({ ...f, data_pagamento: e.target.value })}
            required
          />
        </Field>
        <Field label="Observação">
          <TextArea
            value={f.observacao}
            onChange={(e) => setF({ ...f, observacao: e.target.value })}
            maxLength={300}
          />
        </Field>
        <Button className="h-11 w-full" type="submit" disabled={saving}><Plus /> {saving ? "Criando…" : "Criar período"}</Button>
      </form>
      </DialogContent>
    </Dialog>
  );
}

function RecebidoModal({ recebimento, onClose }: { recebimento: Recebimento | null; onClose: () => void }) {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!recebimento) return;
    const numero = Number(valor.replace(",", "."));
    if (!data || !Number.isFinite(numero) || numero < 0) {
      toast.error("Informe uma data e um valor válidos");
      return;
    }
    setSaving(true);
    try {
      await actions.updateRecebimento(recebimento.id, { status: "recebido", data_recebimento: data, valor_recebido: numero });
      toast.success("Marcado como recebido");
      setValor("");
      onClose();
    } catch {
      toast.error("Não foi possível confirmar o recebimento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={recebimento !== null} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm rounded-xl bg-card p-5">
        <DialogHeader className="text-left"><DialogTitle className="font-display">Confirmar recebimento</DialogTitle><DialogDescription>Registre a data e o valor que entrou.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <Field label="Data do recebimento"><TextInput type="date" value={data} onChange={(e) => setData(e.target.value)} required /></Field>
          <Field label="Valor recebido (R$)"><TextInput type="number" inputMode="decimal" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" required /></Field>
          <Button type="submit" className="h-11 w-full" disabled={saving}><CalendarCheck /> {saving ? "Confirmando…" : "Confirmar recebimento"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
