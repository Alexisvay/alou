import { supabase } from './supabase';
import { type Envelope } from '../types/envelope';
import { type IncomeEntry } from '../types/income';
import { type Asset } from '../types/asset';

// ── Envelopes ──────────────────────────────────────────────────────────────────

export async function fetchEnvelopes(userId: string): Promise<Envelope[]> {
  const { data, error } = await supabase
    .from('envelopes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');

  if (error) throw error;

  return (data ?? []).map((row, idx) => ({
    id: row.id as string,
    name: row.name as string,
    baseAmount: row.base_amount as number,
    targetAmount: row.target_amount as number,
    allocationPercentage: row.allocation_percentage as number,
    // sort_order may be null if the migration hasn't been run yet — fall back to
    // the fetch index so existing rows display in a sensible order.
    order: (row.sort_order as number | null) ?? idx,
  }));
}

export async function upsertEnvelope(
  userId: string,
  data: Omit<Envelope, 'id'>,
  id?: string,
): Promise<Envelope> {
  const resolvedId = id ?? crypto.randomUUID();

  const coreRow = {
    id: resolvedId,
    user_id: userId,
    name: data.name,
    base_amount: data.baseAmount,
    target_amount: data.targetAmount,
    allocation_percentage: data.allocationPercentage ?? 0,
  };

  // Primary: include sort_order (requires the migration to have been run).
  // Fallback: omit sort_order so the save always succeeds even on older schemas.
  const { data: saved, error } = await supabase
    .from('envelopes')
    .upsert({ ...coreRow, sort_order: data.order ?? 0 })
    .select()
    .single();

  if (!error) {
    return {
      id: saved.id as string,
      name: saved.name as string,
      baseAmount: saved.base_amount as number,
      targetAmount: saved.target_amount as number,
      allocationPercentage: saved.allocation_percentage as number,
      order: (saved.sort_order as number | null) ?? 0,
    };
  }

  // sort_order column may not exist yet — retry without it.
  const { data: saved2, error: error2 } = await supabase
    .from('envelopes')
    .upsert(coreRow)
    .select()
    .single();

  if (error2) throw error2;

  return {
    id: saved2.id as string,
    name: saved2.name as string,
    baseAmount: saved2.base_amount as number,
    targetAmount: saved2.target_amount as number,
    allocationPercentage: saved2.allocation_percentage as number,
    order: 0,
  };
}

/** Batch-update only the sort_order of a set of envelopes. */
export async function updateEnvelopeOrders(
  userId: string,
  orders: { id: string; order: number }[],
): Promise<void> {
  await Promise.all(
    orders.map(({ id, order }) =>
      supabase
        .from('envelopes')
        .update({ sort_order: order })
        .eq('id', id)
        .eq('user_id', userId),
    ),
  );
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

// ── Assets ─────────────────────────────────────────────────────────────────────

export async function fetchAssets(userId: string): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    envelopeId: row.envelope_id as string,
    name: row.name as string,
    isin: row.isin as string,
    // Optional columns added in a later migration — may be absent in older rows.
    symbol: (row.symbol as string | null) ?? undefined,
    unitPrice: row.unit_price as number,
    currency: (row.currency as string | null) ?? 'EUR',
    quantity: row.quantity as number,
    isFractional: row.is_fractional as boolean,
    assetType: (row.asset_type as string | null) ?? undefined,
  }));
}

export async function upsertAsset(
  userId: string,
  data: Omit<Asset, 'id'>,
  id?: string,
): Promise<Asset> {
  // Core columns always present.
  const row: Record<string, unknown> = {
    id: id ?? crypto.randomUUID(),
    user_id: userId,
    envelope_id: data.envelopeId,
    name: data.name,
    isin: data.isin,
    unit_price: data.unitPrice,
    quantity: data.quantity,
    is_fractional: data.isFractional,
  };

  // Optional columns: only include if the value is non-empty so the upsert
  // doesn't fail when the migration adding these columns hasn't been run yet.
  if (data.symbol) row.symbol = data.symbol;
  if (data.currency) row.currency = data.currency;
  if (data.assetType) row.asset_type = data.assetType;

  const { data: saved, error } = await supabase
    .from('assets')
    .upsert(row)
    .select()
    .single();

  if (error) throw error;

  return {
    id: saved.id as string,
    envelopeId: saved.envelope_id as string,
    name: saved.name as string,
    isin: saved.isin as string,
    symbol: (saved.symbol as string | null) ?? undefined,
    unitPrice: saved.unit_price as number,
    currency: (saved.currency as string | null) ?? 'EUR',
    quantity: saved.quantity as number,
    isFractional: saved.is_fractional as boolean,
    assetType: (saved.asset_type as string | null) ?? undefined,
  };
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from('assets').delete().eq('id', id);
  if (error) throw error;
}
