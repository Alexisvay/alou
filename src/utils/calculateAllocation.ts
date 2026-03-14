import { type Envelope, type ComputedEnvelope } from '../types/envelope';
import { type IncomeEntry } from '../types/income';

export interface AllocationResult {
  envelope: Envelope;
  allocatedAmount: number;
}

/**
 * Distributes income proportionally to each envelope's remaining gap
 * (targetAmount - currentAmount). Envelopes that have reached their target
 * are ignored. Returns an empty array when all targets are already met.
 */
export function calculateAllocation(
  income: number,
  envelopes: ComputedEnvelope[],
): AllocationResult[] {
  const candidates = envelopes.map((e) => ({
    envelope: e as Envelope,
    remaining: Math.max(e.targetAmount - e.currentAmount, 0),
  })).filter((c) => c.remaining > 0);

  const totalRemaining = candidates.reduce((sum, c) => sum + c.remaining, 0);

  if (totalRemaining === 0) return [];

  return candidates.map(({ envelope, remaining }) => ({
    envelope,
    allocatedAmount: (remaining / totalRemaining) * income,
  }));
}

/**
 * Derives currentAmount for each envelope: baseAmount + sum of all income allocations.
 * Call this whenever baseEnvelopes or incomeHistory changes.
 */
export function recalculateEnvelopes(
  baseEnvelopes: Envelope[],
  incomeHistory: IncomeEntry[],
): ComputedEnvelope[] {
  return baseEnvelopes.map((env) => {
    const incomeTotal = incomeHistory.reduce((sum, entry) => {
      const alloc = entry.allocations.find((a) => a.envelope.id === env.id);
      return sum + (alloc?.allocatedAmount ?? 0);
    }, 0);
    return { ...env, currentAmount: env.baseAmount + incomeTotal };
  });
}
