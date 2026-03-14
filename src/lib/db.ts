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

export async function fetchIncomes(userId: string): Promise<IncomeEntry[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    amount: row.amount as number,
    date: new Date(row.date as string),
    allocations: row.allocations,
  }));
}

export async function upsertIncome(userId: string, entry: IncomeEntry): Promise<void> {
  const { error } = await supabase.from('incomes').upsert({
    id: entry.id,
    user_id: userId,
    amount: entry.amount,
    date: entry.date.toISOString(),
    allocations: entry.allocations,
  });

  if (error) throw error;
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase.from('incomes').delete().eq('id', id);
  if (error) throw error;
}
