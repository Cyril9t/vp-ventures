import Decimal from "decimal.js";

export type ChargeRange = {
  id?: string;
  service: string;
  minimumAmount: Decimal.Value;
  maximumAmount: Decimal.Value | null;
  serviceCharge: Decimal.Value;
  active?: boolean;
};

export function findApplicableCharge(amountValue: Decimal.Value, service: string, rules: ChargeRange[]) {
  const amount = new Decimal(amountValue);
  const matching = rules.filter((rule) => {
    if (rule.service !== service || rule.active === false) return false;
    const min = new Decimal(rule.minimumAmount);
    const max = rule.maximumAmount === null ? null : new Decimal(rule.maximumAmount);
    return amount.greaterThanOrEqualTo(min) && (max === null || amount.lessThanOrEqualTo(max));
  });
  if (matching.length !== 1) {
    throw new Error(matching.length === 0 ? "VALIDATION:No active service-charge rule covers this amount." : "CONFLICT:More than one service-charge rule covers this amount.");
  }
  return new Decimal(matching[0].serviceCharge).toDecimalPlaces(2);
}

export function assertNoOverlap(input: ChargeRange, rules: ChargeRange[]) {
  const min = new Decimal(input.minimumAmount);
  const max = input.maximumAmount === null ? null : new Decimal(input.maximumAmount);
  if (min.lessThan(0) || (max && max.lessThan(min)) || new Decimal(input.serviceCharge).lessThan(0)) {
    throw new Error("VALIDATION:Enter a valid amount range and a non-negative service charge.");
  }
  for (const rule of rules) {
    if (rule.id && input.id && rule.id === input.id) continue;
    if (rule.service !== input.service || rule.active === false) continue;
    const existingMin = new Decimal(rule.minimumAmount);
    const existingMax = rule.maximumAmount === null ? null : new Decimal(rule.maximumAmount);
    const overlaps = (max === null || existingMin.lessThanOrEqualTo(max)) && (existingMax === null || min.lessThanOrEqualTo(existingMax));
    if (overlaps) throw new Error("CONFLICT:This range overlaps another active rule for the same service.");
  }
}
