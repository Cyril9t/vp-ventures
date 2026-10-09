import Decimal from "decimal.js";

Decimal.set({ precision: 32, rounding: Decimal.ROUND_HALF_UP });

export function dec(value: Decimal.Value): Decimal {
  return new Decimal(value ?? 0);
}

export function money(value: Decimal.Value): Decimal {
  return dec(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function quantity(value: Decimal.Value): Decimal {
  return dec(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
}

export function moneyString(value: Decimal.Value): string {
  return money(value).toFixed(2);
}

export function quantityString(value: Decimal.Value): string {
  return quantity(value).toFixed(4);
}

export function asNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(String(value));
}

export function formatNaira(value: number | string) {
  const n = Number(value);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatKg(value: number | string) {
  return `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 4 }).format(Number(value) || 0)} kg`;
}
