const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** Returns formatted currency or '—' for zero / non-finite values. */
export function displayAmount(value: number): string {
  return Number.isFinite(value) && value > 0 ? formatCurrency(value) : '—';
}

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}
