import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput, TextArea } from "@/components/Field";
import { actions, useFullStore, type Recebimento } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { BRL, computeResumo, rangeFromStrings } from "@/lib/calc";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recebimentos")({
  head: () => ({
    meta: [
      { title: "Recebimentos — Entrega Pro" },
      { name: "description", content: "Períodos de pagamento, valores pendentes, atrasados e já recebidos." },
      { property: "og:title", content: "Recebimentos — Entrega Pro" },
      { property: "og:description", content: "Períodos de pagamento, valores pendentes, atrasados e já recebidos." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/recebimentos" },
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

  function marcarRecebido(r: Recebimento) {
    const data = prompt(
      "Data de recebimento (YYYY-MM-DD):",
      new Date().toISOString().slice(0, 10),
    );
    if (!data) return;
    const v = prompt("Valor recebido (R$):", "0");
    if (v == null) return;
    const valor = Number(v.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0) {
      toast.error("Valor inválido");
      return;
    }
    actions.updateRecebimento(r.id, {
      status: "recebido",
      data_recebimento: data,
      valor_recebido: valor,
    });
    toast.success("Marcado como recebido");
  }

  function remover(id: string) {
    if (!confirm("Excluir período?")) return;
    actions.deleteRecebimento(id);
    toast.success("Excluído");
  }

  return (
    <AppShell
      title="Recebimentos"
      right={
        <button
          onClick={() => setOpen(true)}
          aria-label="Novo recebimento"
          className="text-primary"
        >
          <Plus className="size-5" />
        </button>
      }
    >
      <div className="ep-card">
        <div className="grid grid-cols-2 gap-1.5 bg-secondary/40 rounded-md p-1">
          <button
            onClick={() => setTab("pendentes")}
            className={`h-10 rounded font-medium text-sm ${
              tab === "pendentes" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setTab("recebidos")}
            className={`h-10 rounded font-medium text-sm ${
              tab === "recebidos" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Recebidos
          </button>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        {lista.length === 0 && (
          <div className="ep-card text-center text-sm text-muted-foreground">
            Nenhum recebimento {tab === "pendentes" ? "pendente" : "recebido"}.
          </div>
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
            <div
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
              <div className="flex gap-2 mt-3">
                {r.status === "pendente" && (
                  <button
                    onClick={() => marcarRecebido(r)}
                    className="flex-1 h-9 rounded-md bg-success/20 border border-success/40 text-success text-sm font-medium"
                  >
                    Marcar como recebido
                  </button>
                )}
                <button
                  onClick={() => remover(r.id)}
                  className="px-3 h-9 rounded-md border border-destructive/40 text-destructive text-sm"
                >
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ep-card mt-4 text-center">
        <div className="ep-label">
          {tab === "pendentes" ? "Total pendente" : "Total recebido"}
        </div>
        <div className="text-2xl font-bold ep-money-pos">
          {BRL(tab === "pendentes" ? totalPend : totalReceb)}
        </div>
      </div>

      {open && <NovoModal onClose={() => setOpen(false)} />}
    </AppShell>
  );
}

function NovoModal({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({
    nome_periodo: "",
    data_inicial: "",
    data_final: "",
    data_pagamento: "",
    observacao: "",
  });

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nome_periodo.trim() || !f.data_inicial || !f.data_final || !f.data_pagamento) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    if (f.data_final < f.data_inicial) {
      toast.error("Data final antes da inicial");
      return;
    }
    actions.addRecebimento({
      nome_periodo: f.nome_periodo.trim().slice(0, 60),
      data_inicial: f.data_inicial,
      data_final: f.data_final,
      data_pagamento: f.data_pagamento,
      observacao: f.observacao.slice(0, 300),
    });
    toast.success("Período criado");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-end sm:place-items-center p-0 sm:p-4">
      <form
        onSubmit={save}
        className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[90vh] overflow-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Novo Recebimento</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground">
            <X className="size-5" />
          </button>
        </div>
        <Field label="Nome do período">
          <TextInput
            value={f.nome_periodo}
            onChange={(e) => setF({ ...f, nome_periodo: e.target.value })}
            placeholder="Ex: 1ª quinzena de junho"
            maxLength={60}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
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
        <button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold">
          Salvar
        </button>
      </form>
    </div>
  );
}
