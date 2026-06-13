// Money is ALWAYS integer pence. Format on display only. No floats in logic.

export function formatPence(pence: number): string {
  const sign = pence < 0 ? '-' : '';
  const abs = Math.abs(Math.round(pence));
  const pounds = Math.floor(abs / 100);
  const rem = abs % 100;
  if (rem === 0) return `${sign}£${pounds}`;
  return `${sign}£${pounds}.${rem.toString().padStart(2, '0')}`;
}

// Whole-pound display (used in big hero numerals where pennies are noise).
export function formatPounds(pence: number): string {
  const sign = pence < 0 ? '-' : '';
  const pounds = Math.round(Math.abs(pence) / 100);
  return `${sign}£${pounds}`;
}

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}
