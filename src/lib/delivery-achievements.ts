import type { Lancamento } from "@/lib/store";
import { taxaEntrega } from "@/lib/calc";

export const DELIVERY_MILESTONES = [100, 500, 1000] as const;

export function deliveryAchievements(records: readonly Lancamento[]) {
  const delivered = Math.round(records.reduce((sum, record) => {
    if (!record.trabalhou) return sum;
    const packages = Math.max(0, record.pacotes ?? 0);
    const rate = taxaEntrega(packages, record.insucessos);
    return sum + (rate === null ? 0 : packages * rate / 100);
  }, 0));
  const milestones = DELIVERY_MILESTONES.map((target) => ({ target, unlocked: delivered >= target }));
  const next = milestones.find((milestone) => !milestone.unlocked);
  return { delivered, milestones, next, remaining: next ? next.target - delivered : 0 };
}