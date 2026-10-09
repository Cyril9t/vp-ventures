import { describe, expect, it } from "vitest";
import { dec, money, moneyString, quantity, quantityString } from "../src/lib/money";

describe("financial precision helpers", () => {
  it("rounds monetary values to two decimal places", () => {
    expect(moneyString("2.345")).toBe("2.35");
    expect(moneyString("2.344")).toBe("2.34");
  });

  it("keeps money addition exact before rounding", () => {
    expect(money(dec("0.1").plus("0.2")).toFixed(2)).toBe("0.30");
  });

  it("stores gas quantity at four decimal places", () => {
    expect(quantityString("2.941176")).toBe("2.9412");
  });
});
