import { type Envelope, type ComputedEnvelope } from '../types/envelope';
import { type IncomeEntry } from '../types/income';

export interface AllocationResult {
  envelope: Envelope;
  allocatedAmount: number;
}

/**
 * Distributes income using priority-based allocation.
 *
 * Priority score = 1 − (currentAmount / targetAmount)
 *   → 1.00 when an envelope is empty
 *   → 0.20 when it is 80 % funded
 *   → 0.00 (excluded) when it has reached its target
 *
 * Income is split proportionally to these scores so envelopes furthest
 * behind their goal receive the largest recommended share.
 *
 * All allocations are rounded to whole numbers.
 * The last envelope absorbs any rounding remainder so the amounts always
 * sum exactly to incomeAmount.
 *
 * Returns an empty array when all targets are already met (totalScore === 0).
 */
export function calculateAllocation(
  income: number,
  envelopes: ComputedEnvelope[],
): AllocationResult[] {
  const candidates = envelopes
    .filter((e) => e.targetAmount > 0 && e.currentAmount < e.targetAmount)
    .map((e) => ({
      envelope: e as Envelope,
      priority: 1 - e.currentAmount / e.targetAmount,
    }));

  const totalPriority = candidates.reduce((sum, c) => sum + c.priority, 0);

  if (totalPriority === 0) return [];

  // Work in whole numbers so allocations are always clean integers.
  const incomeInt = Math.round(income);
  let distributed = 0;

  return candidates.map(({ envelope, priority }, i) => {
    const isLast = i === candidates.length - 1;
    // Last item absorbs rounding drift so the total equals incomeInt exactly.
    const allocatedAmount = isLast
      ? Math.max(0, incomeInt - distributed)
      : Math.round((priority / totalPriority) * incomeInt);

    distributed += allocatedAmount;
    return { envelope, allocatedAmount };
  });
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
