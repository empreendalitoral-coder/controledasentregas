import { useSyncExternalStore } from "react";

export type Motorista = {
  nome: string;
  foto?: string;
  telefone?: string;
  transportadora?: string;
  veiculo?: string;
  modelo?: string;
  placa?: string;
};

export type Lancamento = {
  id: string;
  data: string; // YYYY-MM-DD
  trabalhou: boolean;
  hora_inicio?: string;
  hora_fim?: string;
  cidade?: string;
  romaneio?: string;
  gaiola?: string;
  pacotes?: number;
  insucessos?: number;
  pnr?: number;
  valor_pnr?: number;
  pacotes_perdidos?: number;
  valor_perdidos?: number;
  observacao?: string;
  valor_dia?: number;
  km_inicial?: number;
  km_final?: number;
  valor_abastecimento?: number;
  litros?: number;
};

export type Recebimento = {
  id: string;
  nome_periodo: string;
  data_inicial: string;
  data_final: string;
  data_pagamento: string;
  valor_recebido?: number;
  data_recebimento?: string;
  status: "pendente" | "recebido";
  observacao?: string;
};

export type Abastecimento = {
  id: string;
  data: string;
  posto?: string;
  km?: number;
  litros: number;
  valor_total: number;
  observacao?: string;
};

export type TipoManutencao =
  | "Troca de óleo"
  | "Pneus"
  | "Freios"
  | "Suspensão"
  | "Lavagem"
  | "Mecânica"
  | "Outros";

export type Manutencao = {
  id: string;
  data: string;
  tipo: TipoManutencao;
  valor: number;
  km?: number;
  observacao?: string;
};

export type State = {
  motorista: Motorista;
  meta_mensal: number;
  lancamentos: Lancamento[];
  recebimentos: Recebimento[];
  abastecimentos: Abastecimento[];
  manutencoes: Manutencao[];
};

const STORAGE_KEY = "entrega-pro:v1";

const defaultState: State = {
  motorista: { nome: "" },
  meta_mensal: 5000,
  lancamentos: [],
  recebimentos: [],
  abastecimentos: [],
  manutencoes: [],
};

function load(): State {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

let state: State = defaultState;
let initialized = false;
const listeners = new Set<() => void>();

function ensureInit() {
  if (!initialized && typeof window !== "undefined") {
    state = load();
    initialized = true;
  }
}

function persist() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function setState(updater: (s: State) => State) {
  ensureInit();
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): State {
  ensureInit();
  return state;
}

function getServerSnapshot(): State {
  return defaultState;
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getServerSnapshot()),
  );
}

export function useFullStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const actions = {
  setMotorista(m: Motorista) {
    setState((s) => ({ ...s, motorista: m }));
  },
  setMeta(v: number) {
    setState((s) => ({ ...s, meta_mensal: v }));
  },
  addLancamento(l: Omit<Lancamento, "id">) {
    const item: Lancamento = { ...l, id: uid() };
    setState((s) => ({ ...s, lancamentos: [item, ...s.lancamentos] }));
    return item;
  },
  updateLancamento(id: string, patch: Partial<Lancamento>) {
    setState((s) => ({
      ...s,
      lancamentos: s.lancamentos.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  },
  deleteLancamento(id: string) {
    setState((s) => ({ ...s, lancamentos: s.lancamentos.filter((l) => l.id !== id) }));
  },
  addRecebimento(r: Omit<Recebimento, "id" | "status">) {
    const item: Recebimento = { ...r, id: uid(), status: "pendente" };
    setState((s) => ({ ...s, recebimentos: [item, ...s.recebimentos] }));
    return item;
  },
  updateRecebimento(id: string, patch: Partial<Recebimento>) {
    setState((s) => ({
      ...s,
      recebimentos: s.recebimentos.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  },
  deleteRecebimento(id: string) {
    setState((s) => ({ ...s, recebimentos: s.recebimentos.filter((r) => r.id !== id) }));
  },
  addAbastecimento(a: Omit<Abastecimento, "id">) {
    const item: Abastecimento = { ...a, id: uid() };
    setState((s) => ({ ...s, abastecimentos: [item, ...s.abastecimentos] }));
    return item;
  },
  deleteAbastecimento(id: string) {
    setState((s) => ({ ...s, abastecimentos: s.abastecimentos.filter((a) => a.id !== id) }));
  },
  addManutencao(m: Omit<Manutencao, "id">) {
    const item: Manutencao = { ...m, id: uid() };
    setState((s) => ({ ...s, manutencoes: [item, ...s.manutencoes] }));
    return item;
  },
  deleteManutencao(id: string) {
    setState((s) => ({ ...s, manutencoes: s.manutencoes.filter((m) => m.id !== id) }));
  },
  exportJSON(): string {
    ensureInit();
    return JSON.stringify(state, null, 2);
  },
  importJSON(json: string) {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) throw new Error("Backup inválido");
    setState(() => ({ ...defaultState, ...parsed }));
  },
  reset() {
    setState(() => defaultState);
  },
};
