export interface Asset {
  id: string;
  envelopeId: string;
  /** Human-readable name resolved from ISIN (e.g. "iShares Core S&P 500 UCITS ETF"). */
  name: string;
  isin: string;
  /** Exchange ticker (e.g. "CSPX.L"), populated by the ISIN lookup. */
  symbol?: string;
  /** Unit price in `currency` at the time of last lookup. */
  unitPrice: number;
  /** ISO 4217 currency code of the unit price (e.g. "EUR", "USD", "GBX"). */
  currency: string;
  /** Units currently held (for display / total value calculation). */
  quantity: number;
  /** Whether fractional units can be purchased (e.g. ETF on a fractional broker). */
  isFractional: boolean;
  /** Broad asset class returned by the data provider (e.g. "ETF", "EQUITY"). */
  assetType?: string;
}
