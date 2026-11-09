import { describe, expect, it } from "vitest";
import type { ColumnResult } from "./calc";
import { summarySentence } from "./summary";

// Only the fields the sentence reads
const r = (o: Partial<ColumnResult>): ColumnResult =>
  ({ payment: "loan", netCost: 0, runningCost: 0, ownershipCost: 0, interestPaid: 0, resaleValue: 0, perMonth: 0, priceExcluded: false, ...o }) as ColumnResult;

describe("summary sentence", () => {
  it("one car: net cost and cost per month", () => {
    expect(summarySentence([{ fullName: "2025 Toyota RAV4 Hybrid AWD", shortName: "Toyota RAV4", result: r({ netCost: 56240.4, perMonth: 937.34 }) }], 5, "net")).toBe(
      "Over 5 years, the 2025 Toyota RAV4 Hybrid AWD costs $56,240 after resale, or $937 a month.",
    );
  });
  it("names the cheapest car, the saving, and why a cheaper-to-run car loses", () => {
    const rav4 = { fullName: "2025 Toyota RAV4 Hybrid AWD", shortName: "Toyota RAV4", result: r({ netCost: 56000, runningCost: 27000, ownershipCost: 50000, interestPaid: 7000, resaleValue: 21000 }) };
    // Model Y: $1,853 cheaper to run, but $14,000 more to buy and $3,000 more interest
    const tesla = { fullName: "2025 Tesla Model Y Long Range AWD", shortName: "Tesla Model Y", result: r({ netCost: 67152, runningCost: 25147, ownershipCost: 67000, interestPaid: 10000, resaleValue: 24995 }) };
    expect(summarySentence([tesla, rav4], 5, "net")).toBe(
      "The 2025 Toyota RAV4 Hybrid AWD saves you $11,152 over 5 years compared with the Tesla Model Y. The Tesla Model Y is $1,853 cheaper to run, but its higher price and interest cancel that out.",
    );
  });
  it("uses running costs when a cash price is left out", () => {
    const a = { fullName: "A car", shortName: "A", result: r({ runningCost: 20000, priceExcluded: true }) };
    const b = { fullName: "B car", shortName: "B", result: r({ runningCost: 25000 }) };
    expect(summarySentence([a, b], 5, "running")).toMatch(/running costs only: the A car costs \$5,000 less to run over 5 years than the B\./);
  });
});
