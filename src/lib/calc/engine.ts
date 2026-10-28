// The DriveTally cost engine. Pure functions only: same inputs, same answer, no website code.
// Every formula here is shown in plain English on the "How we calculate" page.

import type { ColumnInputs, ColumnResult, SharedInputs, VehicleFacts, YearRow } from "./types";

export const GST = 0.05;

// ---------- small building blocks ----------

/** Yearly km = km per day × days per week × 52, or the km-per-year figure the user typed in. */
export function kmPerYear(s: SharedInputs): number {
  return s.kmMode === "yearly" ? s.kmPerYear : s.kmPerDay * s.daysPerWeek * 52;
}

/** Monthly loan payment for principal P, yearly rate apr, n months (standard amortisation). */
export function loanPayment(P: number, apr: number, n: number): number {
  if (P <= 0 || n <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}

/** Balance still owing after k monthly payments. */
export function loanBalance(P: number, apr: number, n: number, k: number): number {
  if (P <= 0 || k >= n) return 0;
  const r = apr / 12;
  const pmt = loanPayment(P, apr, n);
  if (r === 0) return P - pmt * k;
  return P * Math.pow(1 + r, k) - (pmt * (Math.pow(1 + r, k) - 1)) / r;
}

/**
 * Lease payment before GST, the standard Canadian method:
 *   depreciation part = (capitalized cost − residual) ÷ term
 *   finance part      = (capitalized cost + residual) × money factor
 * The money factor is the lease rate in percent ÷ 2400 (4.99% → 0.00208). `rate` here is a fraction (0.0499).
 */
export function moneyFactor(rate: number): number {
  return (rate * 100) / 2400;
}
export function leasePaymentBeforeTax(capCost: number, residual: number, rate: number, n: number): number {
  if (n <= 0) return 0;
  return (capCost - residual) / n + (capCost + residual) * moneyFactor(rate);
}

/** Federal luxury tax: the lesser of 10% of the price and 20% of the amount above $100,000. */
export function luxuryTax(price: number, threshold = 100000): number {
  if (price <= threshold) return 0;
  return Math.min(0.1 * price, 0.2 * (price - threshold));
}

/**
 * Share of the original MSRP a car keeps after `age` years: straight line in year 1, then a steady yearly rate to
 * year 5, then a slower rate (yearly + after5) because older cars lose value more slowly.
 */
export function retention(age: number, year1: number, yearly: number, after5 = 0.03): number {
  if (age <= 0) return 1;
  if (age <= 1) return 1 - (1 - year1) * age;
  if (age <= 5) return year1 * Math.pow(yearly, age - 1);
  return year1 * Math.pow(yearly, 4) * Math.pow(Math.min(0.97, yearly + after5), age - 5);
}

/** Litres or kWh per 100 km after the city/highway mix and the winter months. */
export function blended(city: number, hwy: number, cityShare: number, winterMonths: number, winterPenalty: number): number {
  const mix = city * cityShare + hwy * (1 - cityShare);
  return mix * (1 + winterPenalty * (winterMonths / 12));
}

// ---------- running costs ----------

/** Energy cost for one year of driving `km` (year index y starts at 1, for yearly price increases). */
export function energyCost(v: VehicleFacts, s: SharedInputs, c: ColumnInputs, km: number, y: number): number {
  const fuelPrice =
    (v.fuelGrade === "premium" ? s.gasPremium : v.fuelGrade === "diesel" ? s.diesel : s.gasRegular) * Math.pow(1 + s.fuelIncrease, y - 1);
  const homeShare = s.homeCharging ? s.homeChargeShare : 0;
  const kwhPrice = (homeShare * s.electricityHome + (1 - homeShare) * s.electricityPublic) * Math.pow(1 + s.electricityIncrease, y - 1);

  if (v.fuelType === "ev") {
    const kwh100 = blended(v.cityKwh ?? 0, v.hwyKwh ?? 0, s.cityShare, s.winterMonths, s.winterPenaltyEv);
    return (km / 100) * kwh100 * kwhPrice;
  }
  if (v.fuelType === "phev") {
    // Electric km use the battery rating (plus the small amount of gas some PHEVs still burn); the rest use the gas rating.
    const eKm = km * c.phevElectricShare;
    const gKm = km - eKm;
    const kwh100 = blended(v.cityKwh ?? 0, v.hwyKwh ?? 0, s.cityShare, s.winterMonths, s.winterPenaltyEv);
    const cd100 = (v.cdL ?? 0) * (1 + s.winterPenaltyGas * (s.winterMonths / 12));
    const l100 = blended(v.cityL ?? 0, v.hwyL ?? 0, s.cityShare, s.winterMonths, s.winterPenaltyHybrid);
    return (eKm / 100) * kwh100 * kwhPrice + ((eKm / 100) * cd100 + (gKm / 100) * l100) * fuelPrice;
  }
  const penalty = v.fuelType === "hybrid" ? s.winterPenaltyHybrid : s.winterPenaltyGas;
  const l100 = blended(v.cityL ?? 0, v.hwyL ?? 0, s.cityShare, s.winterMonths, penalty);
  return (km / 100) * l100 * fuelPrice;
}

/**
 * Tire cost in year y. Winter tires on their own rims are bought at the start. Each set (all-season and winter)
 * wears only in its own season and is replaced every time it passes tireLifeKm.
 */
export function tireCost(s: SharedInputs, c: ColumnInputs, kmYear: number, y: number): number {
  const winterKm = kmYear * (s.winterMonths / 12);
  const summerKm = kmYear - winterKm;
  const replacements = (perYear: number) =>
    c.tireLifeKm > 0 ? Math.floor((perYear * y) / c.tireLifeKm) - Math.floor((perYear * (y - 1)) / c.tireLifeKm) : 0;
  const start = y === 1 && s.winterMonths > 0 ? c.winterTireSet : 0;
  return start + (replacements(summerKm) + replacements(winterKm)) * c.tireSet;
}

export function runningYears(v: VehicleFacts, s: SharedInputs, c: ColumnInputs): YearRow[] {
  const km = kmPerYear(s);
  const rows: YearRow[] = [];
  for (let y = 1; y <= s.years; y++) {
    const ageThisYear = c.ageAtStart + y; // age at the end of this year
    const energy = energyCost(v, s, c, km, y);
    const insurance = c.insurancePerYear * Math.pow(1 + s.insuranceIncrease, y - 1);
    const maintenance = km * c.maintenancePerKm;
    const tires = tireCost(s, c, km, y);
    const repairs = ageThisYear > c.warrantyYears ? c.repairsPerYear : 0;
    const registration = s.registrationPerYear + (v.fuelType === "ev" ? s.evAnnualTax : 0);
    const parking = s.parkingPerMonth * 12;
    const charger = y === 1 && s.homeCharging && (v.fuelType === "ev" || v.fuelType === "phev") ? c.homeChargerCost : 0;
    const running = energy + insurance + maintenance + tires + repairs + registration + parking + charger;
    rows.push({ year: y, km, energy, insurance, maintenance, tires, repairs, registration, parking, charger, running });
  }
  return rows;
}

// ---------- the three payment options ----------

export function calculateColumn(v: VehicleFacts, s: SharedInputs, c: ColumnInputs): ColumnResult {
  const months = s.years * 12;
  const years = runningYears(v, s, c);
  const runningCost = years.reduce((a, r) => a + r.running, 0);
  const runningToYear = (y: number) => years.slice(0, y).reduce((a, r) => a + r.running, 0);
  const totalKm = years.reduce((a, r) => a + r.km, 0);
  const valueAt = (yearsHeld: number) => v.msrp * retention(c.ageAtStart + yearsHeld, c.retentionYear1, c.retentionYearly);
  const notes: string[] = [];

  const base = {
    payment: c.payment,
    months,
    totalKm,
    price: c.price,
    freightPdi: c.freightPdi,
    docFee: c.docFee,
    levies: c.levies,
    luxuryTax: c.luxuryTax,
    rebate: c.rebate,
    tradeIn: c.tradeIn,
    years,
    runningCost,
    notes,
  };

  // Amount GST applies to when buying: price + fees + luxury tax, less any trade-in (GST is charged on the net amount).
  const taxableBuy = c.price + c.freightPdi + c.docFee + c.levies + c.luxuryTax - c.tradeIn;

  if (c.payment === "cash") {
    const gst = GST * taxableBuy;
    const purchase = taxableBuy + gst - c.rebate; // what leaves your bank account at the start (trade-in already netted)
    const priceExcluded = !s.includeCashPrice;
    if (priceExcluded) notes.push("Purchase price not included — compare running costs for like-for-like.");
    const ownershipCost = priceExcluded ? 0 : purchase + c.tradeIn;
    const resaleValue = priceExcluded ? 0 : valueAt(s.years);
    const totalCost = ownershipCost + runningCost;
    const netCost = totalCost - resaleValue;
    const cumulative = years.map((_, i) => (priceExcluded ? 0 : purchase + c.tradeIn - valueAt(i + 1)) + runningToYear(i + 1));
    return finish({
      ...base,
      gst,
      downPayment: 0,
      upfront: priceExcluded ? 0 : purchase,
      monthlyPayment: 0,
      paymentsInPeriod: 0,
      interestPaid: 0,
      leaseFees: 0,
      excessKmCharge: 0,
      loanBalanceAtEnd: 0,
      resaleValue,
      leaseBuyout: 0,
      ownershipCost,
      totalCost,
      netCost,
      priceExcluded,
      cumulative,
    });
  }

  if (c.payment === "loan") {
    const gst = GST * taxableBuy;
    // Everything owed after GST and the rebate, less what is paid up front, is borrowed.
    const principal = Math.max(0, taxableBuy + gst - c.rebate - c.downPayment);
    const pmt = loanPayment(principal, c.apr, c.loanTermMonths);
    const paid = Math.min(months, c.loanTermMonths);
    const paymentsInPeriod = pmt * paid;
    const loanBalanceAtEnd = loanBalance(principal, c.apr, c.loanTermMonths, paid);
    const interestPaid = paymentsInPeriod - (principal - loanBalanceAtEnd);
    const resaleValue = valueAt(s.years);
    // Loan total = down payment + trade-in given up + payments in the period + balance still owing at the end.
    const ownershipCost = c.downPayment + c.tradeIn + paymentsInPeriod + loanBalanceAtEnd;
    const totalCost = ownershipCost + runningCost;
    const cumulative = years.map((_, i) => {
      const k = Math.min((i + 1) * 12, c.loanTermMonths);
      return c.downPayment + c.tradeIn + pmt * k + loanBalance(principal, c.apr, c.loanTermMonths, k) - valueAt(i + 1) + runningToYear(i + 1);
    });
    if (c.loanTermMonths < months) notes.push(`Loan is paid off after ${c.loanTermMonths} months.`);
    return finish({
      ...base,
      gst,
      downPayment: c.downPayment,
      upfront: c.downPayment,
      monthlyPayment: pmt,
      paymentsInPeriod,
      interestPaid,
      leaseFees: 0,
      excessKmCharge: 0,
      loanBalanceAtEnd,
      resaleValue,
      leaseBuyout: 0,
      ownershipCost,
      totalCost,
      netCost: totalCost - resaleValue,
      priceExcluded: false,
      cumulative,
    });
  }

  // ----- lease -----
  // Capitalized cost: price + dealer fees + acquisition fee + luxury tax, less the down payment and any rebate.
  // GST is charged on each payment and on the down payment (Alberta: 5% GST only).
  const n = c.leaseTermMonths;
  const residual = c.residualPct * v.msrp;
  const capCost = c.price + c.freightPdi + c.docFee + c.levies + c.luxuryTax + c.acquisitionFee - c.downPayment - c.rebate;
  const pmtBeforeTax = leasePaymentBeforeTax(capCost, residual, c.leaseRate, n);
  const pmt = pmtBeforeTax * (1 + GST);
  const kmYear = kmPerYear(s);
  const excessPerLease = Math.max(0, (kmYear - c.kmAllowancePerYear) * (n / 12)) * c.excessKmRate * (1 + GST);
  const dispositionWithTax = c.dispositionFee * (1 + GST);

  // Walk month by month through the period. If the period is longer than the lease, assume a similar new lease starts.
  let paymentsInPeriod = 0;
  let downPaid = 0;
  let gst = 0;
  let leaseFees = c.acquisitionFee * (1 + GST); // shown as its own line; it is inside the payments via the cap cost
  let excessKmCharge = 0;
  let endFees = 0;
  const costByMonth: number[] = new Array(months).fill(0);
  for (let m = 0; m < months; m++) {
    const monthInLease = m % n;
    if (monthInLease === 0) {
      costByMonth[m] += c.downPayment * (1 + GST);
      downPaid += c.downPayment * (1 + GST);
      gst += c.downPayment * GST;
    }
    costByMonth[m] += pmt;
    paymentsInPeriod += pmt;
    gst += pmtBeforeTax * GST;
    if (monthInLease === n - 1) {
      // lease ends at the end of this month
      costByMonth[m] += dispositionWithTax + excessPerLease;
      endFees += dispositionWithTax;
      excessKmCharge += excessPerLease;
      gst += (dispositionWithTax + excessPerLease) * (GST / (1 + GST));
    }
  }
  if (n < months) notes.push(`Lease is ${n} months; we assume a similar new lease for the rest of the ${s.years}-year period.`);
  if (n > months) notes.push(`Lease runs ${n} months; only the ${months} months inside the period are counted (no early-exit penalty).`);
  leaseFees += endFees;
  const ownershipCost = costByMonth.reduce((a, b) => a + b, 0);
  const totalCost = ownershipCost + runningCost;
  const cumulative = years.map((_, i) => costByMonth.slice(0, (i + 1) * 12).reduce((a, b) => a + b, 0) + runningToYear(i + 1));
  return finish({
    ...base,
    gst,
    downPayment: downPaid,
    upfront: c.downPayment * (1 + GST),
    monthlyPayment: pmt,
    paymentsInPeriod,
    interestPaid: 0,
    leaseFees,
    excessKmCharge,
    loanBalanceAtEnd: 0,
    resaleValue: 0,
    leaseBuyout: residual * (1 + GST), // shown, never added to the total
    ownershipCost,
    totalCost,
    netCost: totalCost,
    priceExcluded: false,
    cumulative,
  });
}

function finish(r: Omit<ColumnResult, "perMonth" | "perKm">): ColumnResult {
  return { ...r, perMonth: r.months ? r.netCost / r.months : 0, perKm: r.totalKm ? r.netCost / r.totalKm : 0 };
}

/**
 * Which column gets the "Lowest cost" badge. Normally the lowest net cost. If any cash column leaves out the
 * purchase price, totals are not like-for-like, so we compare running costs only (and say so).
 */
export function lowestCost(results: ColumnResult[]): { index: number; basis: "net" | "running" } | null {
  if (results.length < 2) return null;
  const basis = results.some((r) => r.priceExcluded) ? "running" : "net";
  let best = 0;
  results.forEach((r, i) => {
    const val = basis === "net" ? r.netCost : r.runningCost;
    const bestVal = basis === "net" ? results[best].netCost : results[best].runningCost;
    if (val < bestVal) best = i;
  });
  return { index: best, basis };
}
