import { describe, expect, it } from "vitest";
import { backupCounts, parseBackupJSON, validateBackup } from "./backup";

describe("validação de backup", () => {
  it("aceita um backup do Entrega Pro e conta os registros", () => {
    const backup = validateBackup({
      motorista: { nome: "Motorista" },
      lancamentos: [{ id: "1" }],
      recebimentos: [{ id: "2" }],
      abastecimentos: [],
      manutencoes: [{ id: "3" }],
    });

    expect(backupCounts(backup)).toEqual({
      lancamentos: 1,
      recebimentos: 1,
      abastecimentos: 0,
      manutencoes: 1,
      total: 3,
    });
  });

  it("rejeita JSON corrompido", () => {
    expect(() => parseBackupJSON("{arquivo quebrado")).toThrow("JSON corrompido");
  });

  it("rejeita arquivos que não são backups do Entrega Pro", () => {
    expect(() => validateBackup({ qualquer: "conteúdo" })).toThrow("não é um backup do Entrega Pro");
  });

  it("rejeita listas com formato inválido", () => {
    expect(() => validateBackup({ motorista: {}, lancamentos: "inválido" })).toThrow(
      "Lista de lancamentos inválida",
    );
  });

  it("rejeita arquivos maiores que 5 MB antes da restauração", () => {
    const oversized = JSON.stringify({ motorista: { nome: "x".repeat(5_000_001) } });
    expect(() => parseBackupJSON(oversized)).toThrow("Arquivo muito grande");
  });
});