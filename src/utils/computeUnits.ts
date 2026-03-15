export interface UnitRecommendation {
  /** Number of units purchasable with the allocation. */
  units: number;
  /** Cash left over after buying whole units (0 when isFractional). */
  remainingCash: number;
}

/**
 * Computes how many units of an asset can be bought with a given cash allocation.
 *
 * - isFractional = true  → fractional units allowed (e.g. 0.667); no cash remainder.
 * - isFractional = false → whole units only; remainder returned as remainingCash.
 */
export function computeUnits(
  allocation: number,
  unitPrice: number,
  isFractional: boolean,
): UnitRecommendation {
  if (unitPrice <= 0 || allocation <= 0) {
    return { units: 0, remainingCash: Math.max(0, allocation) };
  }

  if (isFractional) {
    const units = allocation / unitPrice;
    return { units, remainingCash: 0 };
  }

  const units = Math.floor(allocation / unitPrice);
  const remainingCash = allocation - units * unitPrice;
  return { units, remainingCash };
}
