import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// Types — kept as before for backward compatibility with pages
// ============================================================

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
  data: string;
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
  hydrated: boolean;
};

const LEGACY_KEY = "entrega-pro:v1";

const defaultState: State = {
  motorista: { nome: "" },
  meta_mensal: 5000,
  lancamentos: [],
  recebimentos: [],
  abastecimentos: [],
  manutencoes: [],
  hydrated: false,
};

let state: State = defaultState;
let userId: string | null = null;
let loading = false;
const listeners = new Set<() => void>();

function setState(updater: (s: State) => State) {
  state = updater(state);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): State {
  return state;
}

function getServerSnapshot(): State {
  return defaultState;
}

// strip seconds from HH:MM:SS
function timeStr(v?: string | null): string | undefined {
  if (!v) return undefined;
  return v.slice(0, 5);
}

function num(v: number | null | undefined): number | undefined {
  if (v == null) return undefined;
  return Number(v);
}

async function hydrate(uid: string) {
  if (loading) return;
  loading = true;
  try {
    const [prof, lanc, rec, abast, man] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("lancamentos").select("*").eq("user_id", uid).order("data", { ascending: false }),
      supabase.from("recebimentos").select("*").eq("user_id", uid).order("data_pagamento", { ascending: true }),
      supabase.from("abastecimentos").select("*").eq("user_id", uid).order("data", { ascending: false }),
      supabase.from("manutencoes").select("*").eq("user_id", uid).order("data", { ascending: false }),
    ]);

    const p = prof.data;
    const motorista: Motorista = p
      ? {
          nome: p.nome ?? "",
          foto: p.foto ?? undefined,
          telefone: p.telefone ?? undefined,
          transportadora: p.transportadora ?? undefined,
          veiculo: p.veiculo ?? undefined,
          modelo: p.modelo ?? undefined,
          placa: p.placa ?? undefined,
        }
      : { nome: "" };

    setState(() => ({
      motorista,
      meta_mensal: p?.meta_mensal ? Number(p.meta_mensal) : 5000,
      lancamentos: (lanc.data ?? []).map((l) => ({
        id: l.id,
        data: l.data,
        trabalhou: l.trabalhou,
        hora_inicio: timeStr(l.hora_inicio),
        hora_fim: timeStr(l.hora_fim),
        cidade: l.cidade ?? undefined,
        romaneio: l.romaneio ?? undefined,
        gaiola: l.gaiola ?? undefined,
        pacotes: l.pacotes ?? undefined,
        insucessos: l.insucessos ?? undefined,
        pnr: l.pnr ?? undefined,
        valor_pnr: num(l.valor_pnr),
        pacotes_perdidos: l.pacotes_perdidos ?? undefined,
        valor_perdidos: num(l.valor_perdidos),
        observacao: l.observacao ?? undefined,
        valor_dia: num(l.valor_dia),
        km_inicial: num(l.km_inicial),
        km_final: num(l.km_final),
        valor_abastecimento: num(l.valor_abastecimento),
        litros: num(l.litros),
      })),
      recebimentos: (rec.data ?? []).map((r) => ({
        id: r.id,
        nome_periodo: r.nome_periodo,
        data_inicial: r.data_inicial,
        data_final: r.data_final,
        data_pagamento: r.data_pagamento,
        valor_recebido: num(r.valor_recebido),
        data_recebimento: r.data_recebimento ?? undefined,
        status: r.status as "pendente" | "recebido",
        observacao: r.observacao ?? undefined,
      })),
      abastecimentos: (abast.data ?? []).map((a) => ({
        id: a.id,
        data: a.data,
        posto: a.posto ?? undefined,
        km: num(a.km),
        litros: Number(a.litros),
        valor_total: Number(a.valor_total),
        observacao: a.observacao ?? undefined,
      })),
      manutencoes: (man.data ?? []).map((m) => ({
        id: m.id,
        data: m.data,
        tipo: m.tipo as TipoManutencao,
        valor: Number(m.valor),
        km: num(m.km),
        observacao: m.observacao ?? undefined,
      })),
      hydrated: true,
    }));
  } finally {
    loading = false;
  }
}

let initialised = false;
function ensureInit() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  supabase.auth.getSession().then(({ data }) => {
    const uid = data.session?.user.id ?? null;
    userId = uid;
    if (uid) hydrate(uid);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    const uid = session?.user.id ?? null;
    if (uid !== userId) {
      userId = uid;
      if (uid) hydrate(uid);
      else setState(() => defaultState);
    }
  });
}

export function useStore<T>(selector: (s: State) => T): T {
  ensureInit();
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getServerSnapshot()),
  );
}

export function useFullStore(): State {
  ensureInit();
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useHydrate() {
  useEffect(() => {
    ensureInit();
  }, []);
}

// helpers
function uidOrThrow(): string {
  if (!userId) throw new Error("Usuário não autenticado");
  return userId;
}

function lancToDb(l: Partial<Lancamento>) {
  const out: Record<string, unknown> = {
    trabalhou: l.trabalhou ?? true,
    hora_inicio: l.hora_inicio || null,
    hora_fim: l.hora_fim || null,
    cidade: l.cidade || null,
    romaneio: l.romaneio || null,
    gaiola: l.gaiola || null,
    pacotes: l.pacotes ?? null,
    insucessos: l.insucessos ?? null,
    pnr: l.pnr ?? null,
    valor_pnr: l.valor_pnr ?? null,
    pacotes_perdidos: l.pacotes_perdidos ?? null,
    valor_perdidos: l.valor_perdidos ?? null,
    observacao: l.observacao || null,
    valor_dia: l.valor_dia ?? null,
    km_inicial: l.km_inicial ?? null,
    km_final: l.km_final ?? null,
    valor_abastecimento: l.valor_abastecimento ?? null,
    litros: l.litros ?? null,
  };
  if (l.data) out.data = l.data;
  return out as { data: string; [k: string]: unknown };
}

export const actions = {
  async setMotorista(m: Motorista) {
    const uid = uidOrThrow();
    const { error } = await supabase
      .from("profiles")
      .update({
        nome: m.nome,
        foto: m.foto ?? null,
        telefone: m.telefone ?? null,
        transportadora: m.transportadora ?? null,
        veiculo: m.veiculo ?? null,
        modelo: m.modelo ?? null,
        placa: m.placa ?? null,
      })
      .eq("id", uid);
    if (error) throw error;
    setState((s) => ({ ...s, motorista: m }));
  },

  async setMeta(v: number) {
    const uid = uidOrThrow();
    const { error } = await supabase.from("profiles").update({ meta_mensal: v }).eq("id", uid);
    if (error) throw error;
    setState((s) => ({ ...s, meta_mensal: v }));
  },

  async addLancamento(l: Omit<Lancamento, "id">): Promise<Lancamento> {
    const uid = uidOrThrow();
    const { data, error } = await supabase
      .from("lancamentos")
      .insert({ ...lancToDb(l), user_id: uid })
      .select()
      .single();
    if (error) throw error;
    const item: Lancamento = { ...l, id: data.id };
    setState((s) => ({ ...s, lancamentos: [item, ...s.lancamentos] }));
    return item;
  },

  async updateLancamento(id: string, patch: Partial<Lancamento>) {
    const { error } = await supabase.from("lancamentos").update(lancToDb(patch) as never).eq("id", id);
    if (error) throw error;
    setState((s) => ({
      ...s,
      lancamentos: s.lancamentos.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  },

  async deleteLancamento(id: string) {
    const { error } = await supabase.from("lancamentos").delete().eq("id", id);
    if (error) throw error;
    setState((s) => ({ ...s, lancamentos: s.lancamentos.filter((l) => l.id !== id) }));
  },

  async addRecebimento(r: Omit<Recebimento, "id" | "status">): Promise<Recebimento> {
    const uid = uidOrThrow();
    const { data, error } = await supabase
      .from("recebimentos")
      .insert({
        user_id: uid,
        nome_periodo: r.nome_periodo,
        data_inicial: r.data_inicial,
        data_final: r.data_final,
        data_pagamento: r.data_pagamento,
        valor_recebido: r.valor_recebido ?? null,
        data_recebimento: r.data_recebimento || null,
        observacao: r.observacao || null,
      })
      .select()
      .single();
    if (error) throw error;
    const item: Recebimento = { ...r, id: data.id, status: "pendente" };
    setState((s) => ({ ...s, recebimentos: [item, ...s.recebimentos] }));
    return item;
  },

  async updateRecebimento(id: string, patch: Partial<Recebimento>) {
    const { error } = await supabase
      .from("recebimentos")
      .update({
        nome_periodo: patch.nome_periodo,
        data_inicial: patch.data_inicial,
        data_final: patch.data_final,
        data_pagamento: patch.data_pagamento,
        valor_recebido: patch.valor_recebido ?? null,
        data_recebimento: patch.data_recebimento || null,
        status: patch.status,
        observacao: patch.observacao ?? null,
      })
      .eq("id", id);
    if (error) throw error;
    setState((s) => ({
      ...s,
      recebimentos: s.recebimentos.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  },

  async deleteRecebimento(id: string) {
    const { error } = await supabase.from("recebimentos").delete().eq("id", id);
    if (error) throw error;
    setState((s) => ({ ...s, recebimentos: s.recebimentos.filter((r) => r.id !== id) }));
  },

  async addAbastecimento(a: Omit<Abastecimento, "id">): Promise<Abastecimento> {
    const uid = uidOrThrow();
    const { data, error } = await supabase
      .from("abastecimentos")
      .insert({
        user_id: uid,
        data: a.data,
        posto: a.posto || null,
        km: a.km ?? null,
        litros: a.litros,
        valor_total: a.valor_total,
        observacao: a.observacao || null,
      })
      .select()
      .single();
    if (error) throw error;
    const item: Abastecimento = { ...a, id: data.id };
    setState((s) => ({ ...s, abastecimentos: [item, ...s.abastecimentos] }));
    return item;
  },

  async deleteAbastecimento(id: string) {
    const { error } = await supabase.from("abastecimentos").delete().eq("id", id);
    if (error) throw error;
    setState((s) => ({ ...s, abastecimentos: s.abastecimentos.filter((a) => a.id !== id) }));
  },

  async addManutencao(m: Omit<Manutencao, "id">): Promise<Manutencao> {
    const uid = uidOrThrow();
    const { data, error } = await supabase
      .from("manutencoes")
      .insert({
        user_id: uid,
        data: m.data,
        tipo: m.tipo,
        valor: m.valor,
        km: m.km ?? null,
        observacao: m.observacao || null,
      })
      .select()
      .single();
    if (error) throw error;
    const item: Manutencao = { ...m, id: data.id };
    setState((s) => ({ ...s, manutencoes: [item, ...s.manutencoes] }));
    return item;
  },

  async deleteManutencao(id: string) {
    const { error } = await supabase.from("manutencoes").delete().eq("id", id);
    if (error) throw error;
    setState((s) => ({ ...s, manutencoes: s.manutencoes.filter((m) => m.id !== id) }));
  },

  exportJSON(): string {
    return JSON.stringify(state, null, 2);
  },

  async importJSON(json: string) {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) throw new Error("Backup inválido");
    await actions.importFromObject(parsed);
  },

  hasLegacyData(): boolean {
    if (typeof window === "undefined") return false;
    return !!window.localStorage.getItem(LEGACY_KEY);
  },

  async importLegacyLocalStorage() {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) throw new Error("Nenhum dado local encontrado");
    await actions.importFromObject(JSON.parse(raw));
    window.localStorage.removeItem(LEGACY_KEY);
  },

  async importFromObject(data: Partial<State>) {
    const uid = uidOrThrow();
    if (data.motorista) {
      await supabase
        .from("profiles")
        .update({
          nome: data.motorista.nome ?? "",
          foto: data.motorista.foto ?? null,
          telefone: data.motorista.telefone ?? null,
          transportadora: data.motorista.transportadora ?? null,
          veiculo: data.motorista.veiculo ?? null,
          modelo: data.motorista.modelo ?? null,
          placa: data.motorista.placa ?? null,
          meta_mensal: data.meta_mensal ?? 5000,
        })
        .eq("id", uid);
    }
    if (data.lancamentos?.length) {
      await supabase.from("lancamentos").insert(
        data.lancamentos.map((l) => ({ ...lancToDb(l), user_id: uid })),
      );
    }
    if (data.recebimentos?.length) {
      await supabase.from("recebimentos").insert(
        data.recebimentos.map((r) => ({
          user_id: uid,
          nome_periodo: r.nome_periodo,
          data_inicial: r.data_inicial,
          data_final: r.data_final,
          data_pagamento: r.data_pagamento,
          valor_recebido: r.valor_recebido ?? null,
          data_recebimento: r.data_recebimento || null,
          status: r.status,
          observacao: r.observacao || null,
        })),
      );
    }
    if (data.abastecimentos?.length) {
      await supabase.from("abastecimentos").insert(
        data.abastecimentos.map((a) => ({
          user_id: uid,
          data: a.data,
          posto: a.posto || null,
          km: a.km ?? null,
          litros: a.litros,
          valor_total: a.valor_total,
          observacao: a.observacao || null,
        })),
      );
    }
    if (data.manutencoes?.length) {
      await supabase.from("manutencoes").insert(
        data.manutencoes.map((m) => ({
          user_id: uid,
          data: m.data,
          tipo: m.tipo,
          valor: m.valor,
          km: m.km ?? null,
          observacao: m.observacao || null,
        })),
      );
    }
    if (userId) await hydrate(userId);
  },

  async reset() {
    const uid = uidOrThrow();
    await Promise.all([
      supabase.from("lancamentos").delete().eq("user_id", uid),
      supabase.from("recebimentos").delete().eq("user_id", uid),
      supabase.from("abastecimentos").delete().eq("user_id", uid),
      supabase.from("manutencoes").delete().eq("user_id", uid),
    ]);
    setState((s) => ({ ...s, lancamentos: [], recebimentos: [], abastecimentos: [], manutencoes: [] }));
  },

  async signOut() {
    await supabase.auth.signOut();
  },
};
