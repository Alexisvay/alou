import { type Envelope } from '../types/envelope';

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