import { describe, it, expect } from "vitest";
import { launchStreak } from "./streak";
const now = new Date(2026, 10, 17, 20);
describe("launchStreak", () => {
  it("conta dias seguidos até hoje", () => {
    expect(launchStreak([{ data: "2026-11-17" }, { data: "2026-11-16" }, { data: "2026-11-15" }, { data: "2026-11-13" }], now)).toEqual({ count: 3, lancouHoje: true });
  });
  it("mantém a sequência se ainda não lançou hoje", () => {
    expect(launchStreak([{ data: "2026-11-16" }, { data: "2026-11-15" }], now)).toEqual({ count: 2, lancouHoje: false });
  });
  it("zera quando falhou ontem", () => {
    expect(launchStreak([{ data: "2026-11-15" }], now).count).toBe(0);
  });
});
