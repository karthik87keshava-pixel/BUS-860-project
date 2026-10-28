// Hand-worked examples for the DriveTally calculation module.
// Each test writes out the working in comments so anyone can redo it with a calculator.
// Round numbers on purpose: 20,000 km a year, 5 years, no winter, no price increases (unless a test says otherwise).

import { describe, expect, it } from "vitest";
import {
  blended,
  calculateColumn,
  energyCost,
  evapRebate,
  loanBalance,
  loanPayment,
  lowestCost,
  luxuryTax,
  resolveColumn,
  retention,
  type ColumnInputs,
  type SharedInputs,
  type VehicleFacts,
} from "./index";

const shared: SharedInputs = {
  kmMode: "yearly",
  kmPerDay: 0,
  daysPerWeek: 7,
  kmPerYear: 20000,
  cityShare: 0.5,
  years: 5,
  winterMonths: 0,
  homeCharging: true,
  homeChargeShare: 1,
  parkingPerMonth: 0,
  gasRegular: 1.5,
  gasPremium: 1.8,
  diesel: 1.6,
  fuelIncrease: 0,
  electricityHome: 0.2,
  electricityPublic: 0.6,
  electricityIncrease: 0,
  registrationPerYear: 93,
  evAnnualTax: 200,
  insuranceIncrease: 0,
  winterPenaltyGas: 0.15,
  winterPenaltyHybrid: 0.2,
  winterPenaltyEv: 0.35,
  includeCashPrice: true,
  currentYear: 2026,
};

const gasCar: VehicleFacts = {
  id: "gas",
  year: 2026,
  make: "Example",
  model: "Gas Sedan",
  family: "Gas Sedan",
  fuelType: "gas",
  fuelGrade: "regular",
  classBucket: "car-mid",
  cityL: 10,
  hwyL: 6,
  msrp: 30000,
};

const ev: VehicleFacts = {
  id: "ev",
  year: 2026,
  make: "Example",
  model: "Electric SUV",
  family: "Electric SUV",
  fuelType: "ev",
  fuelGrade: "electricity",
  classBucket: "suv-small",
  cityKwh: 16,
  hwyKwh: 20,
  msrp: 40000,
};

// Column inputs with simple numbers. Only the fields a test needs are changed from here.
const baseColumn: ColumnInputs = {
  payment: "cash",
  condition: "new",
  price: 30000,
  freightPdi: 2000,
  docFee: 500,
  levies: 100,
  luxuryTax: 0,
  rebate: 0,
  downPayment: 0,
  tradeIn: 0,
  apr: 0.06,
  loanTermMonths: 60,
  leaseRate: 0.048,
  leaseTermMonths: 60,
  residualPct: 0.4,
  kmAllowancePerYear: 16000,
  excessKmRate: 0.1,
  acquisitionFee: 650,
  dispositionFee: 400,
  insurancePerYear: 2000,
  maintenancePerKm: 0.05,
  winterTireSet: 0,
  tireSet: 1000,
  tireLifeKm: 50000,
  repairsPerYear: 600,
  warrantyYears: 3,
  homeChargerCost: 2000,
  phevElectricShare: 0,
  retentionYear1: 0.8,
  retentionYearly: 0.9,
  ageAtStart: 0,
};

/*
 Gas car running costs (same for every gas example):
   Fuel use: (10 + 6) ÷ 2 = 8 L/100 km. 20,000 km = 200 × 8 = 1,600 L × $1.50 = $2,400 a year → $12,000
   Insurance $2,000 × 5 = $10,000
   Maintenance 20,000 × $0.05 = $1,000 a year → $5,000
   Tires: a new set every 50,000 km → at 60,000 km (year 3) and 100,000 km (year 5) = 2 × $1,000 = $2,000
   Repairs: warranty 3 years, so years 4 and 5 = 2 × $600 = $1,200
   Registration $93 × 5 = $465
   Total running = 12,000 + 10,000 + 5,000 + 2,000 + 1,200 + 465 = $30,665
 Resale after 5 years: $30,000 × 0.8 × 0.9⁴ = 30,000 × 0.8 × 0.6561 = $15,746.40
*/
const GAS_RUNNING = 30665;
const GAS_RESALE = 15746.4;

describe("Example 1 — gas car, cash, purchase price included", () => {
  it("adds price, fees and GST, then subtracts resale", () => {
    const r = calculateColumn(gasCar, shared, { ...baseColumn, payment: "cash" });
    // Taxable: 30,000 + 2,000 + 500 + 100 = 32,600. GST 5% = 1,630. Paid at the start: 34,230.
    expect(r.gst).toBeCloseTo(1630, 2);
    expect(r.ownershipCost).toBeCloseTo(34230, 2);
    expect(r.runningCost).toBeCloseTo(GAS_RUNNING, 2);
    // Total 34,230 + 30,665 = 64,895. Net 64,895 − 15,746.40 = 49,148.60
    expect(r.totalCost).toBeCloseTo(64895, 2);
    expect(r.resaleValue).toBeCloseTo(GAS_RESALE, 2);
    expect(r.netCost).toBeCloseTo(49148.6, 2);
    // Per month 49,148.60 ÷ 60 = 819.14; per km 49,148.60 ÷ 100,000 = $0.4915
    expect(r.perMonth).toBeCloseTo(819.1433, 3);
    expect(r.perKm).toBeCloseTo(0.4914860, 6);
  });
});

describe("Example 2 — gas car, cash, purchase price excluded (team default)", () => {
  it("shows running costs only and no resale", () => {
    const r = calculateColumn(gasCar, { ...shared, includeCashPrice: false }, { ...baseColumn, payment: "cash" });
    expect(r.priceExcluded).toBe(true);
    expect(r.totalCost).toBeCloseTo(GAS_RUNNING, 2);
    expect(r.resaleValue).toBe(0);
    expect(r.netCost).toBeCloseTo(GAS_RUNNING, 2);
    expect(r.notes).toContain("Purchase price not included — compare running costs for like-for-like.");
  });
});

describe("Example 3 — gas car, loan at 6% over 60 months", () => {
  it("adds down payment, payments and interest", () => {
    const r = calculateColumn(gasCar, shared, { ...baseColumn, payment: "loan", downPayment: 5000 });
    // Borrowed: 32,600 + 1,630 GST − 5,000 down = 29,230.
    // 6% for 60 months costs $19.3328 per $1,000 a month (standard loan table) → 29.23 × 19.3328 = $565.10
    expect(r.monthlyPayment).toBeCloseTo(565.098, 2);
    // 60 payments = 33,905.88; interest = 33,905.88 − 29,230 = 4,675.88; nothing owing at the end
    expect(r.paymentsInPeriod).toBeCloseTo(33905.88, 1);
    expect(r.interestPaid).toBeCloseTo(4675.88, 1);
    expect(r.loanBalanceAtEnd).toBeCloseTo(0, 6);
    // Total = 5,000 + 33,905.88 + 30,665 = 69,570.88; net = − 15,746.40 = 53,824.48
    expect(r.totalCost).toBeCloseTo(69570.88, 1);
    expect(r.netCost).toBeCloseTo(53824.48, 1);
  });
});

describe("Example 4 — gas car, loan longer than the period (0% to keep it simple)", () => {
  it("adds the balance still owing at the end", () => {
    const r = calculateColumn(gasCar, shared, { ...baseColumn, payment: "loan", downPayment: 5000, apr: 0, loanTermMonths: 84 });
    // Borrowed 29,230 over 84 months at 0% = $347.98 a month. After 60 payments, 24 of 84 are left: 29,230 × 24/84 = 8,351.43
    expect(r.monthlyPayment).toBeCloseTo(347.976, 2);
    expect(r.loanBalanceAtEnd).toBeCloseTo(8351.43, 1);
    expect(r.interestPaid).toBeCloseTo(0, 6);
    // Payments 60 × 347.976 = 20,878.57. Total = 5,000 + 20,878.57 + 8,351.43 + 30,665 = 64,895 (same as cash, as it should be at 0%)
    expect(r.totalCost).toBeCloseTo(64895, 1);
  });
});

/*
 EV running costs:
   Electricity: (16 + 20) ÷ 2 = 18 kWh/100 km. 200 × 18 = 3,600 kWh × $0.20 = $720 a year → $3,600
   Insurance $10,000; maintenance 20,000 × $0.03 = $600 a year → $3,000; tires $2,000 (as above)
   Repairs after warranty 2 × $400 = $800; registration ($93 + $200 EV tax) × 5 = $1,465; home charger $2,000 once
   Total running = 3,600 + 10,000 + 3,000 + 2,000 + 800 + 1,465 + 2,000 = $22,865
*/
const evColumn: ColumnInputs = { ...baseColumn, price: 40000, maintenancePerKm: 0.03, repairsPerYear: 400 };
const EV_RUNNING = 22865;

describe("Example 5 — EV, cash with the $5,000 federal rebate", () => {
  it("subtracts the rebate after GST", () => {
    const r = calculateColumn(ev, shared, { ...evColumn, payment: "cash", rebate: 5000 });
    // Taxable 42,600; GST 2,130; paid 44,730 − 5,000 rebate = 39,730
    expect(r.ownershipCost).toBeCloseTo(39730, 2);
    expect(r.runningCost).toBeCloseTo(EV_RUNNING, 2);
    expect(r.totalCost).toBeCloseTo(62595, 2);
    // Resale 40,000 × 0.52488 = 20,995.20 → net 41,599.80
    expect(r.resaleValue).toBeCloseTo(20995.2, 2);
    expect(r.netCost).toBeCloseTo(41599.8, 2);
  });
});

describe("Example 6 — EV, 60-month lease", () => {
  it("uses the Canadian lease formula with GST on each payment", () => {
    const r = calculateColumn(ev, shared, { ...evColumn, payment: "lease", rebate: 5000 });
    // Cap cost: 40,000 + 2,000 + 500 + 100 + 650 acquisition − 5,000 rebate = 38,250. Residual 40% of 40,000 = 16,000.
    // Depreciation part (38,250 − 16,000) ÷ 60 = 370.83; money factor 4.8% ÷ 2400 = 0.002;
    // finance part (38,250 + 16,000) × 0.002 = 108.50 → 479.33 + 5% GST = $503.30 a month
    expect(r.monthlyPayment).toBeCloseTo(503.3, 2);
    expect(r.paymentsInPeriod).toBeCloseTo(30198, 1);
    // End of lease: disposition 400 + GST = 420; extra km (20,000 − 16,000) × 5 years = 20,000 km × $0.10 = 2,000 + GST = 2,100
    expect(r.excessKmCharge).toBeCloseTo(2100, 2);
    expect(r.ownershipCost).toBeCloseTo(30198 + 420 + 2100, 1);
    expect(r.totalCost).toBeCloseTo(32718 + EV_RUNNING, 1);
    // Buyout shown separately (16,000 + GST), never added
    expect(r.leaseBuyout).toBeCloseTo(16800, 2);
    expect(r.netCost).toBeCloseTo(r.totalCost, 6);
  });
});

describe("Example 7 — gas car, 36-month lease inside a 5-year period", () => {
  it("assumes a second similar lease and counts only the months in the period", () => {
    const r = calculateColumn(gasCar, shared, {
      ...baseColumn,
      payment: "lease",
      leaseTermMonths: 36,
      residualPct: 0.5,
      downPayment: 2000,
      kmAllowancePerYear: 20000,
    });
    // Cap cost 30,000 + 2,600 fees + 650 − 2,000 down = 31,250; residual 15,000
    // (31,250 − 15,000) ÷ 36 = 451.39; (31,250 + 15,000) × 0.002 = 92.50 → 543.89 × 1.05 = 571.08 a month
    const pmt = ((31250 - 15000) / 36 + 46250 * 0.002) * 1.05;
    expect(r.monthlyPayment).toBeCloseTo(pmt, 6);
    // Two down payments (2,000 + GST each), 60 payments, one disposition fee (first lease ends at month 36), no extra km
    expect(r.ownershipCost).toBeCloseTo(2 * 2100 + 60 * pmt + 420, 4);
    expect(r.notes.join(" ")).toMatch(/similar new lease/);
  });
});

describe("Example 8 — plug-in hybrid energy split", () => {
  it("charges electric km at the electricity price and the rest at the gas price", () => {
    const phev: VehicleFacts = { ...gasCar, fuelType: "phev", cityKwh: 20, hwyKwh: 20, cityL: 6, hwyL: 6, cdL: 0, electricRangeKm: 60 };
    // Half of 20,000 km on electricity: 10,000 km × 20 kWh/100 = 2,000 kWh × $0.20 = $400
    // Half on gas: 10,000 km × 6 L/100 = 600 L × $1.50 = $900 → $1,300 a year
    expect(energyCost(phev, shared, { ...baseColumn, phevElectricShare: 0.5 }, 20000, 1)).toBeCloseTo(1300, 6);
  });
});

describe("Building blocks", () => {
  it("winter raises fuel use for the winter share of the year", () => {
    // 8 L/100 km mix; 6 winter months at +20% → 8 × (1 + 0.2 × 0.5) = 8.8
    expect(blended(10, 6, 0.5, 6, 0.2)).toBeCloseTo(8.8, 6);
  });
  it("loan payment matches a standard table and balance falls to zero", () => {
    expect(loanPayment(10000, 0.06, 60)).toBeCloseTo(193.328, 2);
    expect(loanBalance(10000, 0.06, 60, 60)).toBeCloseTo(0, 6);
    expect(loanBalance(10000, 0, 60, 30)).toBeCloseTo(5000, 6);
  });
  it("luxury tax is the lesser of 10% and 20% of the amount over $100,000", () => {
    expect(luxuryTax(90000)).toBe(0);
    expect(luxuryTax(105000)).toBeCloseTo(1000, 6); // 20% × 5,000 = 1,000 < 10,500
    expect(luxuryTax(150000)).toBeCloseTo(10000, 6); // 20% × 50,000 = 10,000 < 15,000
  });
  it("value kept: straight line in year 1, then a fixed yearly rate", () => {
    expect(retention(0.5, 0.8, 0.9)).toBeCloseTo(0.9, 6);
    expect(retention(3, 0.8, 0.9)).toBeCloseTo(0.648, 6);
  });
  it("federal EVAP rebate follows the price cap and lease length", () => {
    expect(evapRebate(ev, "cash", "new", 45000, 0, 2026)).toBe(5000);
    expect(evapRebate(ev, "cash", "new", 55000, 0, 2026)).toBe(0);
    expect(evapRebate(ev, "cash", "used", 30000, 0, 2026)).toBe(0);
    expect(evapRebate({ ...ev, fuelType: "phev" }, "loan", "new", 45000, 0, 2026)).toBe(2500);
    expect(evapRebate(ev, "lease", "new", 45000, 36, 2026)).toBe(3750);
    expect(evapRebate(ev, "cash", "new", 45000, 0, 2027)).toBe(4000);
    expect(evapRebate(gasCar, "cash", "new", 25000, 0, 2026)).toBe(0);
  });
  it("lowest-cost badge uses running costs when a cash column excludes its price", () => {
    const a = calculateColumn(gasCar, shared, { ...baseColumn, payment: "loan" });
    const b = calculateColumn(gasCar, { ...shared, includeCashPrice: false }, { ...baseColumn, payment: "cash" });
    expect(lowestCost([a, b])?.basis).toBe("running");
    const c = calculateColumn(gasCar, shared, { ...baseColumn, payment: "cash" });
    expect(lowestCost([a, c])).toEqual({ index: 1, basis: "net" });
  });
});

describe("Defaults from a real vehicle", () => {
  it("an older model year is priced as a used car", () => {
    const old: VehicleFacts = { ...gasCar, year: 2018, latestFamilyYear: 2026, msrp: 30000, make: "Toyota" };
    const c = resolveColumn(old, shared, "cash");
    expect(c.condition).toBe("used");
    expect(c.price).toBeLessThan(15000);
    expect(c.freightPdi).toBe(0);
    expect(c.rebate).toBe(0);
  });
  it("a lease is always new and gets the EV rebate when under the cap", () => {
    const c = resolveColumn(ev, shared, "lease");
    expect(c.condition).toBe("new");
    expect(c.leaseTermMonths).toBe(60);
    expect(c.rebate).toBe(5000);
  });
  it("cumulative cost ends at the net cost", () => {
    const r = calculateColumn(gasCar, shared, { ...baseColumn, payment: "loan", downPayment: 5000 });
    expect(r.cumulative[r.cumulative.length - 1]).toBeCloseTo(r.netCost, 4);
  });
});
