import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Field, TextInput, TextArea } from "@/components/Field";
import { actions, useFullStore, type Lancamento } from "@/lib/store";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BRL, kmRodado, lucroLiquido } from "@/lib/calc";

export const Route = createFileRoute("/lancamento/$id")({
  head: () => ({
    meta: [{ title: "Lançamento — Entrega Pro" }],
  }),
  component: LancamentoPage,
});

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function LancamentoPage() {
  const { id } = Route.useParams();
  const isNew = id === "novo";
  const nav = useNavigate();
  const state = useFullStore();
  const existing = useMemo(
    () => (isNew ? null : state.lancamentos.find((l) => l.id === id) || null),
    [id, isNew, state.lancamentos],
  );

  const [f, setF] = useState<Lancamento>(
    existing ?? {
      id: "",
      data: todayStr(),
      trabalhou: true,
    },
  );

  function set<K extends keyof Lancamento>(k: K, v: Lancamento[K]) {
    setF((p) => ({ ...p, [k]: v }));
  }

  function num(v: string): number | undefined {
    if (v === "" || v == null) return undefined;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }

  const km = kmRodado(f);
  const litros = f.litros ?? 0;
  const valorAbast = f.valor_abastecimento ?? 0;
  const precoLitro = litros > 0 ? valorAbast / litros : 0;
  const consumo = litros > 0 ? km / litros : 0;
  const custoKM = km > 0 ? valorAbast / km : 0;
  const lucroLiq = lucroLiquido(f);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.data) {
      toast.error("Informe a data");
      return;
    }
    if (f.trabalhou) {
      if (
        f.km_inicial != null &&
        f.km_final != null &&
        f.km_final < f.km_inicial
      ) {
        toast.error("KM final deve ser maior ou igual ao KM inicial");
        return;
      }
    }
    const payload: Lancamento = {
      ...f,
      cidade: f.cidade?.slice(0, 60),
      romaneio: f.romaneio?.slice(0, 30),
      gaiola: f.gaiola?.slice(0, 20),
      observacao: f.observacao?.slice(0, 500),
    };
    if (isNew) {
      const { id: _omit, ...rest } = payload;
      void _omit;
      actions.addLancamento(rest);
      toast.success("Lançamento salvo");
    } else {
      actions.updateLancamento(id, payload);
      toast.success("Lançamento atualizado");
    }
    nav({ to: "/historico" });
  }

  function remove() {
    if (isNew) return;
    if (!confirm("Excluir este lançamento?")) return;
    actions.deleteLancamento(id);
    toast.success("Excluído");
    nav({ to: "/historico" });
  }

  return (
    <AppShell title={isNew ? "Novo Lançamento" : "Editar Lançamento"} back="/historico">
      <form onSubmit={save} className="space-y-4">
        <div className="ep-card space-y-3">
          <Field label="Data">
            <TextInput
              type="date"
              value={f.data}
              onChange={(e) => set("data", e.target.value)}
              required
            />
          </Field>
          <div>
            <div className="ep-label mb-1.5">Trabalhou hoje?</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set("trabalhou", true)}
                className={`h-11 rounded-md font-medium border transition ${
                  f.trabalhou
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-input/40 text-foreground border-border"
                }`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => set("trabalhou", false)}
                className={`h-11 rounded-md font-medium border transition ${
                  !f.trabalhou
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-input/40 text-foreground border-border"
                }`}
              >
                Não (Folga)
              </button>
            </div>
          </div>
        </div>

        {f.trabalhou && (
          <>
            <div className="ep-card grid grid-cols-2 gap-3">
              <Field label="Horário de início">
                <TextInput
                  type="time"
                  value={f.hora_inicio ?? ""}
                  onChange={(e) => set("hora_inicio", e.target.value)}
                />
              </Field>
              <Field label="Horário de término">
                <TextInput
                  type="time"
                  value={f.hora_fim ?? ""}
                  onChange={(e) => set("hora_fim", e.target.value)}
                />
              </Field>
              <Field label="Cidade" className="col-span-2">
                <TextInput
                  value={f.cidade ?? ""}
                  onChange={(e) => set("cidade", e.target.value)}
                  maxLength={60}
                />
              </Field>
              <Field label="Romaneio">
                <TextInput
                  value={f.romaneio ?? ""}
                  onChange={(e) => set("romaneio", e.target.value)}
                  maxLength={30}
                />
              </Field>
              <Field label="Gaiola">
                <TextInput
                  value={f.gaiola ?? ""}
                  onChange={(e) => set("gaiola", e.target.value)}
                  maxLength={20}
                />
              </Field>
              <Field label="Pacotes entregues">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={f.pacotes ?? ""}
                  onChange={(e) => set("pacotes", num(e.target.value))}
                />
              </Field>
              <Field label="Insucessos">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={f.insucessos ?? ""}
                  onChange={(e) => set("insucessos", num(e.target.value))}
                />
              </Field>
              <Field label="PNR">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={f.pnr ?? ""}
                  onChange={(e) => set("pnr", num(e.target.value))}
                />
              </Field>
              <Field label="Valor PNR (R$)">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={f.valor_pnr ?? ""}
                  onChange={(e) => set("valor_pnr", num(e.target.value))}
                />
              </Field>
              <Field label="Pacotes perdidos">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={f.pacotes_perdidos ?? ""}
                  onChange={(e) => set("pacotes_perdidos", num(e.target.value))}
                />
              </Field>
              <Field label="Valor perdidos (R$)">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={f.valor_perdidos ?? ""}
                  onChange={(e) => set("valor_perdidos", num(e.target.value))}
                />
              </Field>
              <Field label="Valor recebido pelo dia (R$)" className="col-span-2">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={f.valor_dia ?? ""}
                  onChange={(e) => set("valor_dia", num(e.target.value))}
                />
              </Field>
              <Field label="KM inicial">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={f.km_inicial ?? ""}
                  onChange={(e) => set("km_inicial", num(e.target.value))}
                />
              </Field>
              <Field label="KM final">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={f.km_final ?? ""}
                  onChange={(e) => set("km_final", num(e.target.value))}
                />
              </Field>
              <Field label="Valor abastecimento (R$)">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={f.valor_abastecimento ?? ""}
                  onChange={(e) => set("valor_abastecimento", num(e.target.value))}
                />
              </Field>
              <Field label="Litros abastecidos">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={f.litros ?? ""}
                  onChange={(e) => set("litros", num(e.target.value))}
                />
              </Field>
              <Field label="Observação" className="col-span-2">
                <TextArea
                  value={f.observacao ?? ""}
                  onChange={(e) => set("observacao", e.target.value)}
                  maxLength={500}
                />
              </Field>
            </div>

            <div className="ep-card grid grid-cols-2 gap-2">
              <Calc label="KM rodado" v={`${km.toLocaleString("pt-BR")} km`} />
              <Calc
                label="Preço por litro"
                v={litros > 0 ? BRL(precoLitro) : "—"}
              />
              <Calc
                label="Consumo médio"
                v={litros > 0 ? `${consumo.toFixed(2)} km/l` : "—"}
              />
              <Calc
                label="Custo por KM"
                v={km > 0 ? BRL(custoKM) : "—"}
              />
              <div className="col-span-2 ep-stat-tile">
                <div className="ep-label">Lucro líquido (do dia)</div>
                <div className="text-xl font-bold ep-money-pos">{BRL(lucroLiq)}</div>
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold"
        >
          Salvar lançamento
        </button>

        {!isNew && (
          <button
            type="button"
            onClick={remove}
            className="w-full h-11 rounded-xl border border-destructive/40 text-destructive font-medium"
          >
            Excluir lançamento
          </button>
        )}
      </form>
    </AppShell>
  );
}

function Calc({ label, v }: { label: string; v: string }) {
  return (
    <div className="ep-stat-tile">
      <div className="ep-label">{label}</div>
      <div className="ep-value">{v}</div>
    </div>
  );
}
