import { supabase } from './supabase';
import { type Envelope } from '../types/envelope';
import { type IncomeEntry } from '../types/income';

// ── Envelopes ──────────────────────────────────────────────────────────────────

export async function fetchEnvelopes(userId: string): Promise<Envelope[]> {
  const { data, error } = await supabase
    .from('envelopes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    baseAmount: row.base_amount as number,
    targetAmount: row.target_amount as number,
    allocationPercentage: row.allocation_percentage as number,
  }));
}

export async function upsertEnvelope(
  userId: string,
  data: Omit<Envelope, 'id'>,
  id?: string,
): Promise<Envelope> {
  const row = {
    id: id ?? crypto.randomUUID(),
    user_id: userId,
    name: data.name,
    base_amount: data.baseAmount,
    target_amount: data.targetAmount,
    allocation_percentage: data.allocationPercentage ?? 0,
  };

  const { data: saved, error } = await supabase
    .from('envelopes')
    .upsert(row)
    .select()
    .single();

  if (error) throw error;

  return {
    id: saved.id as string,
    name: saved.name as string,
    baseAmount: saved.base_amount as number,
    targetAmount: saved.target_amount as number,
    allocationPercentage: saved.allocation_percentage as number,
  };
}

export async function deleteEnvelope(id: string): Promise<void> {
  const { error } = await supabase.from('envelopes').delete().eq('id', id);
  if (error) throw error;
}

// ── Incomes ────────────────────────────────────────────────────────────────────

// The `allocations` JSONB column stores either:
//   - Legacy format (raw array):  AllocationResult[]
//   - Current format (object):    { isManual: boolean; items: AllocationResult[] }
// Both formats are handled transparently so existing rows keep working.

type StoredAllocations =
  | { isManual: boolean; items: { envelope: { id: string; name: string; baseAmount: number; targetAmount: number; allocationPercentage: number }; allocatedAmount: number }[] }
  | { envelope: { id: string; name: string; baseAmount: number; targetAmount: number; allocationPercentage: number }; allocatedAmount: number }[];

export async function fetchIncomes(userId: string): Promise<IncomeEntry[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const raw = row.allocations as StoredAllocations;
    const isLegacy = Array.isArray(raw);
    return {
      id: row.id as string,
      amount: row.amount as number,
      date: new Date(row.date as string),
      allocations: isLegacy ? raw : (raw as Exclude<StoredAllocations, unknown[]>).items ?? [],
      isManualAllocation: isLegacy ? false : (raw as Exclude<StoredAllocations, unknown[]>).isManual ?? false,
    };
  });
}

export async function upsertIncome(userId: string, entry: IncomeEntry): Promise<void> {
  // Primary format: embed isManualAllocation inside the allocations JSONB object.
  // If the column type rejects a JSON object (e.g. was created as a plain array type),
  // fall back to the legacy array format so the entry is always persisted.
  const { error } = await supabase.from('incomes').upsert({
    id: entry.id,
    user_id: userId,
    amount: entry.amount,
    date: entry.date.toISOString(),
    allocations: { isManual: entry.isManualAllocation, items: entry.allocations },
  });

  if (!error) return;

  // Fallback: legacy array format (flag is not persisted but the income entry is).
  const { error: error2 } = await supabase.from('incomes').upsert({
    id: entry.id,
    user_id: userId,
    amount: entry.amount,
    date: entry.date.toISOString(),
    allocations: entry.allocations,
  });

  if (error2) throw error2;
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase.from('incomes').delete().eq('id', id);
  if (error) throw error;
}
