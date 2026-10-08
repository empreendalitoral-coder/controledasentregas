import type { State } from "./store";

const MAX_BACKUP_BYTES = 5_000_000;
const MAX_ITEMS = {
  lancamentos: 20_000,
  recebimentos: 5_000,
  abastecimentos: 10_000,
  manutencoes: 10_000,
  multas: 5_000,
} as const;

export type BackupCounts = Record<keyof typeof MAX_ITEMS, number> & { total: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateBackup(value: unknown): Partial<State> {
  if (!isRecord(value)) throw new Error("Estrutura do backup inválida");
  if (!("motorista" in value || "lancamentos" in value || "recebimentos" in value || "multas" in value)) {
    throw new Error("Este arquivo não é um backup do Entrega Pro");
  }
  if ("motorista" in value && !isRecord(value.motorista)) {
    throw new Error("Dados do motorista inválidos");
  }
  if ("meta_mensal" in value && (typeof value.meta_mensal !== "number" || !Number.isFinite(value.meta_mensal))) {
    throw new Error("Meta mensal inválida");
  }

  for (const [key, limit] of Object.entries(MAX_ITEMS)) {
    const items = value[key];
    if (items != null && !Array.isArray(items)) throw new Error(`Lista de ${key} inválida`);
    if (Array.isArray(items) && items.length > limit) throw new Error(`Backup excede o limite de ${key}`);
  }
  if (Array.isArray(value.multas)) {
    for (const m of value.multas) {
      if (!isRecord(m) || typeof m.data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(m.data) || !Number.isFinite(Date.parse(m.data)) || typeof m.valor !== "number" || !Number.isFinite(m.valor) || m.valor <= 0 || !["pendente", "paga"].includes(String(m.status)) || (m.descricao != null && (typeof m.descricao !== "string" || m.descricao.length > 500))) throw new Error("Dados de multa inválidos");
    }
  }
  return value as Partial<State>;
}

export function parseBackupJSON(json: string): Partial<State> {
  if (new Blob([json]).size > MAX_BACKUP_BYTES) throw new Error("Arquivo muito grande (máximo 5 MB)");
  try {
    return validateBackup(JSON.parse(json) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("Formato de arquivo inválido (JSON corrompido)");
    throw error;
  }
}

export function backupCounts(value: Partial<State>): BackupCounts {
  const counts = {
    lancamentos: value.lancamentos?.length ?? 0,
    recebimentos: value.recebimentos?.length ?? 0,
    abastecimentos: value.abastecimentos?.length ?? 0,
    manutencoes: value.manutencoes?.length ?? 0,
    multas: value.multas?.length ?? 0,
  };
  return { ...counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) };
}