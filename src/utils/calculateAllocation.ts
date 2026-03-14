import { type Envelope, type ComputedEnvelope } from '../types/envelope';
import { type IncomeEntry } from '../types/income';

export interface AllocationResult {
  envelope: Envelope;
  allocatedAmount: number;
}

export function calculateAllocation(
  income: number,
  envelopes: Envelope[]
): AllocationResult[] {
  return envelopes.map((envelope) => ({
    envelope,
    allocatedAmount: (income * envelope.allocationPercentage) / 100,
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
