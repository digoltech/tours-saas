import { describe, expect, test } from "bun:test";
import { recurrenceDates } from "./transport.service.js";

describe("recurrenceDates", () => {
  test("returns selected weekdays inclusive of the date range", () => {
    expect(recurrenceDates("2026-09-28", "2026-10-05", [1, 3]).map((date) => date.toISOString().slice(0, 10))).toEqual([
      "2026-09-28", "2026-09-30", "2026-10-05",
    ]);
  });

  test("supports leap days and a one day range", () => {
    expect(recurrenceDates("2028-02-29", "2028-02-29", [2]).map((date) => date.toISOString().slice(0, 10))).toEqual(["2028-02-29"]);
  });

  test("rejects inverted ranges and dates beyond a year", () => {
    expect(() => recurrenceDates("2026-10-01", "2026-09-30", [1])).toThrow("date range");
    expect(() => recurrenceDates("2026-01-01", "2027-01-02", [1])).toThrow("one year");
  });

  test("rejects a range with no selected weekday", () => {
    expect(() => recurrenceDates("2026-09-28", "2026-09-29", [4])).toThrow("No selected weekdays");
  });
});
