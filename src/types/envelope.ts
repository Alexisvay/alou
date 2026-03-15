export interface Envelope {
  id: string;
  name: string;
  baseAmount: number;
  targetAmount: number;
  allocationPercentage?: number;
  /** Display order index (0-based). Lower values appear first. */
  order?: number;
}

/** Envelope with currentAmount derived from baseAmount + income allocations. */
export interface ComputedEnvelope extends Envelope {
  currentAmount: number;
}
