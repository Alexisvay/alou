import { type AllocationResult } from '../utils/calculateAllocation';

export interface IncomeEntry {
  id: string;
  amount: number;
  date: Date;
  allocations: AllocationResult[];
  isManualAllocation: boolean;
}
