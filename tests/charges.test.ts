import { describe, expect, it } from "vitest";
import { assertNoOverlap, findApplicableCharge, type ChargeRange } from "../src/lib/charges";

const rules: ChargeRange[] = [
  { service: "CASH_WITHDRAWAL", minimumAmount: "100.00", maximumAmount: "500.00", serviceCharge: "50.00", active: true },
  { service: "CASH_WITHDRAWAL", minimumAmount: "500.01", maximumAmount: "1000.00", serviceCharge: "100.00", active: true },
  { service: "CASH_WITHDRAWAL", minimumAmount: "1000.01", maximumAmount: "5000.00", serviceCharge: "200.00", active: true },
  { service: "CASH_WITHDRAWAL", minimumAmount: "5000.01", maximumAmount: null, serviceCharge: "300.00", active: true },
];

describe("POS charge rules", () => {
  it("finds the applicable rule for amounts at range boundaries", () => {
    expect(findApplicableCharge("100", "CASH_WITHDRAWAL", rules).toFixed(2)).toBe("50.00");
    expect(findApplicableCharge("500.01", "CASH_WITHDRAWAL", rules).toFixed(2)).toBe("100.00");
    expect(findApplicableCharge("1000.01", "CASH_WITHDRAWAL", rules).toFixed(2)).toBe("200.00");
    expect(findApplicableCharge("250000", "CASH_WITHDRAWAL", rules).toFixed(2)).toBe("300.00");
  });

  it("rejects amounts with no matching rule", () => {
    expect(() => findApplicableCharge("99.99", "CASH_WITHDRAWAL", rules)).toThrow(/No active service-charge rule/);
  });

  it("does not apply rules to another service", () => {
    expect(() => findApplicableCharge("300", "AIRTIME", rules)).toThrow(/No active service-charge rule/);
  });

  it("rejects overlapping ranges for the same service", () => {
    expect(() => assertNoOverlap({ service: "CASH_WITHDRAWAL", minimumAmount: "450", maximumAmount: "600", serviceCharge: "80" }, rules)).toThrow(/overlaps/);
  });

  it("allows the same amount range for a different service", () => {
    expect(() => assertNoOverlap({ service: "AIRTIME", minimumAmount: "100", maximumAmount: "500", serviceCharge: "20" }, rules)).not.toThrow();
  });
});
