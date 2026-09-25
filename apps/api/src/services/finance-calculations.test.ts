import { describe, expect, test } from "bun:test";
import { calculateCancellation, calculateCommission, calculateTax } from "./finance-calculations.js";

describe("finance calculations", () => {
  test("calculates GST before or after discount and rounds to cents", () => {
    expect(calculateTax(1000, 100, 5, true)).toBe(45);
    expect(calculateTax(1000, 100, 5, false)).toBe(50);
    expect(calculateTax(19.99, 0, 5, true)).toBe(1);
  });
  test("calculates percentage and per-seat fixed commission", () => {
    expect(calculateCommission(1000, 100, 2, "PERCENTAGE", 10)).toBe(90);
    expect(calculateCommission(1000, 100, 2, "FIXED", 25)).toBe(50);
  });
  test("selects exact and adjacent cancellation tier boundaries", () => {
    const tiers = [{ hoursBeforeDeparture: 24, feePercent: 10 }, { hoursBeforeDeparture: 6, feePercent: 50 }, { hoursBeforeDeparture: 0, feePercent: 100 }];
    expect(calculateCancellation(1000, 24, tiers)).toEqual({ feePercent: 10, feeAmount: 100, eligibleRefund: 900 });
    expect(calculateCancellation(1000, 23.99, tiers).feePercent).toBe(50);
    expect(calculateCancellation(1000, 5.99, tiers).feePercent).toBe(100);
  });
  test("applies the closest configured rule when cancellation is inside the last tier", () => {
    expect(calculateCancellation(250, -2, [{ hoursBeforeDeparture: 12, feePercent: 30 }])).toEqual({ feePercent: 30, feeAmount: 75, eligibleRefund: 175 });
  });
  test("defaults to a full cancellation fee when no rules exist", () => {
    expect(calculateCancellation(100, 30, [])).toEqual({ feePercent: 100, feeAmount: 100, eligibleRefund: 0 });
  });
});
