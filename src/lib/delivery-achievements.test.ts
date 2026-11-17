import { describe, expect, it } from "vitest";
import { deliveryAchievements } from "./delivery-achievements";

const record = (pacotes: number, insucessos = 0, trabalhou = true) => ({ id: "day", data: "2026-11-17", trabalhou, pacotes, insucessos });

describe("delivery milestones", () => {
  for (const target of [100, 500, 1000]) {
    it(`unlocks ${target} deliveries exactly at the threshold`, () => {
      expect(deliveryAchievements([record(target - 1)]).milestones.find((m) => m.target === target)?.unlocked).toBe(false);
      expect(deliveryAchievements([record(target)]).milestones.find((m) => m.target === target)?.unlocked).toBe(true);
    });
  }
  it("counts successful deliveries across all worked days, not failures or days off", () => {
    const result = deliveryAchievements([record(80, 10), record(40, 10), record(1000, 0, false)]);
    expect(result.delivered).toBe(100);
    expect(result.next?.target).toBe(500);
    expect(result.remaining).toBe(400);
  });
  it("handles no records, excessive failures and completed milestones", () => {
    expect(deliveryAchievements([]).delivered).toBe(0);
    expect(deliveryAchievements([record(10, 20)]).delivered).toBe(0);
    expect(deliveryAchievements([record(1200)]).next).toBeUndefined();
    expect(deliveryAchievements([record(1200)]).remaining).toBe(0);
  });
});