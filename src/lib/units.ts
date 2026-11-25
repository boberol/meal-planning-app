/**
 * Units for ingredient amounts, and helpers to read and show amounts.
 */

/** The units you can pick in the recipe editor. `value` is what's saved. */
export const UNITS: { value: string; label: string; name: string }[] = [
  { value: 'piece', label: 'pcs', name: 'pieces' },
  { value: 'g', label: 'g', name: 'grams' },
  { value: 'kg', label: 'kg', name: 'kilograms' },
  { value: 'ml', label: 'ml', name: 'millilitres' },
  { value: 'l', label: 'l', name: 'litres' },
  { value: 'tsp', label: 'tsp', name: 'teaspoons' },
  { value: 'tbsp', label: 'tbsp', name: 'tablespoons' },
  { value: 'cup', label: 'cup', name: 'cups' },
  { value: 'clove', label: 'clove', name: 'cloves' },
  { value: 'bunch', label: 'bunch', name: 'bunches' },
  { value: 'can', label: 'can', name: 'cans' },
  { value: 'pack', label: 'pack', name: 'packs' },
  { value: 'slice', label: 'slice', name: 'slices' },
  { value: 'loaf', label: 'loaf', name: 'loaves' },
  { value: 'pinch', label: 'pinch', name: 'pinches' },
];

export function unitLabel(unit: string | null | undefined): string {
  if (!unit) return '';
  return UNITS.find((u) => u.value === unit)?.label ?? unit;
}

export function unitName(unit: string | null | undefined): string {
  if (!unit) return 'no unit';
  return UNITS.find((u) => u.value === unit)?.name ?? unit;
}

/**
 * Reads what someone typed as an amount. Accepts "2", "0.5", "0,5" (comma
 * decimals), "1/2" and "1 1/2". Returns null for an empty box and NaN for
 * something that isn't a number.
 */
export function parseAmount(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = t.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[2]) === 0 ? NaN : Number(fraction[1]) / Number(fraction[2]);
  return /^\d*\.?\d+$/.test(t) ? Number(t) : NaN;
}

/** Shows an amount without long decimals: 2, 0.5, 1.25, 333. */
export function formatAmount(amount: number): string {
  if (amount >= 100) return String(Math.round(amount));
  if (amount >= 10) return String(Math.round(amount * 10) / 10);
  return String(Math.round(amount * 100) / 100);
}

/** "400 g", "2", "1 tbsp", or "" when there's no amount. */
export function formatQuantity(amount: number | null, unit: string | null): string {
  if (amount == null) return unit && unit !== 'piece' ? unitLabel(unit) : '';
  if (!unit || unit === 'piece') return formatAmount(amount);
  return `${formatAmount(amount)} ${unitLabel(unit)}`;
}
