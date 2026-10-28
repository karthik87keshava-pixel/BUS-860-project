// Fills in every per-column default from the chosen vehicle, the payment option and the shared inputs.
// The website shows these numbers pre-filled; the user can change any of them ("overrides").

import {
  CLASS_FACTORS,
  LUXURY_MAKES,
  MAINTENANCE_PER_KM,
  SOURCES,
  STRONG_RESALE_MAKES,
  WEAK_RESALE_MAKES,
} from "./defaults";
import { kmPerYear, luxuryTax, retention } from "./engine";
import type { ColumnInputs, Condition, Payment, SharedInputs, VehicleFacts } from "./types";

export type Overrides = Partial<ColumnInputs>;

/** New if this is the newest model year of the family in the data (and recent); otherwise bought used. */
export function defaultCondition(v: VehicleFacts, currentYear: number): Condition {
  const latest = v.latestFamilyYear ?? v.year;
  return v.year >= latest && v.year >= currentYear - 1 ? "new" : "used";
}

/** Approximate age in years when bought: a 2025 model bought in late 2026 is about 1.75 years old. */
export function ageAtPurchase(v: VehicleFacts, condition: Condition, currentYear: number): number {
  if (condition === "new") return 0;
  return Math.max(0.5, currentYear - v.year + 0.75);
}

export function retentionParams(v: VehicleFacts): { year1: number; yearly: number } {
  let { year1, yearly } = SOURCES.retention.value;
  if (v.fuelType === "ev") {
    year1 -= 0.06;
    yearly -= 0.03;
  } else if (STRONG_RESALE_MAKES.has(v.make) || v.classBucket.startsWith("pickup")) {
    year1 += 0.04;
    yearly += 0.02;
  } else if (WEAK_RESALE_MAKES.has(v.make)) {
    year1 -= 0.04;
    yearly -= 0.03;
  }
  return { year1: round2(year1), yearly: round2(yearly) };
}

/**
 * Rough insurance estimate: the Alberta average premium is for the average insured car (worth roughly $25,000),
 * so we scale it up or down with the car's value (to the power 0.35, so a car worth twice as much costs about 27% more
 * to insure) and by class. Real quotes vary a lot.
 */
export const INSURANCE_REFERENCE_VALUE = 25000;
export function insuranceEstimate(v: VehicleFacts, value: number): number {
  const avg = SOURCES.insuranceAverage.value;
  const est = avg * Math.pow(Math.max(value, 3000) / INSURANCE_REFERENCE_VALUE, 0.35) * CLASS_FACTORS[v.classBucket].insurance;
  return Math.round(Math.min(9000, Math.max(1200, est)) / 10) * 10;
}

/** Default share of km a plug-in hybrid drives on electricity, from its electric range and daily km. */
export function phevElectricShare(v: VehicleFacts, s: SharedInputs): number {
  if (v.fuelType !== "phev" || !v.electricRangeKm) return 0;
  const perDrivingDay = s.kmMode === "yearly" ? s.kmPerYear / (s.daysPerWeek * 52 || 364) : s.kmPerDay;
  if (perDrivingDay <= 0) return 0;
  // Winter cuts the usable electric range
  const winterLoss = 1 / (1 + s.winterPenaltyEv);
  const range = v.electricRangeKm * (1 - (1 - winterLoss) * (s.winterMonths / 12));
  const share = Math.min(1, range / perDrivingDay) * 0.95; // a little gas use even on short days (cold starts, heater)
  return round2(s.homeCharging ? share : share * 0.3);
}

/** Federal EVAP rebate the default assumes, before the user changes it. */
export function evapRebate(v: VehicleFacts, payment: Payment, condition: Condition, transactionValue: number, leaseMonths: number, year: number): number {
  if (condition !== "new" || (v.fuelType !== "ev" && v.fuelType !== "phev")) return 0;
  const t = SOURCES.evap.value;
  if (transactionValue > t.cap) return 0;
  const amounts = year >= 2027 ? t.from2027 : t;
  const full = v.fuelType === "ev" ? amounts.ev : amounts.phev;
  if (payment !== "lease") return full;
  const share = leaseMonths >= 48 ? 1 : leaseMonths >= 36 ? 0.75 : leaseMonths >= 24 ? 0.5 : leaseMonths >= 12 ? 0.25 : 0;
  return full * share;
}

/** Lease residual: what the car is expected to be worth at the end of the lease, as a share of MSRP. */
export function residualDefault(v: VehicleFacts, months: number): number {
  const { year1, yearly } = retentionParams(v);
  // Leasing companies set residuals a little below expected market value
  return round2(retention(months / 12, year1, yearly) * 0.97);
}

export function resolveColumn(v: VehicleFacts, s: SharedInputs, payment: Payment, overrides: Overrides = {}): ColumnInputs {
  // A lease is always on a new car.
  const condition: Condition = payment === "lease" ? "new" : (overrides.condition ?? defaultCondition(v, s.currentYear));
  const ageAtStart = overrides.ageAtStart ?? ageAtPurchase(v, condition, s.currentYear);
  const ret = retentionParams(v);
  const retentionYear1 = overrides.retentionYear1 ?? ret.year1;
  const retentionYearly = overrides.retentionYearly ?? ret.yearly;

  const price = overrides.price ?? (condition === "new" ? v.msrp : roundTo(v.msrp * retention(ageAtStart, retentionYear1, retentionYearly), 100));
  const freightPdi = overrides.freightPdi ?? (condition === "new" ? SOURCES.freightPdi.value : 0);
  const docFee = overrides.docFee ?? SOURCES.docFee.value;
  const levies = overrides.levies ?? (condition === "new" ? SOURCES.levies.value : 0);
  const lux = overrides.luxuryTax ?? (condition === "new" ? Math.round(luxuryTax(price)) : 0);

  const leaseTermMonths = overrides.leaseTermMonths ?? Math.min(60, Math.max(24, s.years * 12));
  const rebate = overrides.rebate ?? evapRebate(v, payment, condition, price + freightPdi + docFee + levies, leaseTermMonths, s.currentYear);

  const factors = CLASS_FACTORS[v.classBucket];
  const luxury = LUXURY_MAKES.has(v.make) ? 1.3 : 1;
  const maintenancePerKm = overrides.maintenancePerKm ?? round3(MAINTENANCE_PER_KM[v.fuelType] * factors.maintenance * luxury);

  return {
    payment,
    condition,
    price,
    freightPdi,
    docFee,
    levies,
    luxuryTax: lux,
    rebate,
    downPayment: overrides.downPayment ?? (payment === "loan" ? roundTo(price * 0.1, 500) : 0),
    tradeIn: overrides.tradeIn ?? 0,
    apr: overrides.apr ?? (condition === "new" ? SOURCES.loanApr.value : SOURCES.usedLoanApr.value),
    loanTermMonths: overrides.loanTermMonths ?? SOURCES.loanTermMonths.value,
    leaseRate: overrides.leaseRate ?? SOURCES.leaseRate.value,
    leaseTermMonths,
    residualPct: overrides.residualPct ?? residualDefault(v, leaseTermMonths),
    kmAllowancePerYear: overrides.kmAllowancePerYear ?? SOURCES.kmAllowancePerYear.value,
    excessKmRate: overrides.excessKmRate ?? SOURCES.excessKmRate.value,
    acquisitionFee: overrides.acquisitionFee ?? SOURCES.acquisitionFee.value,
    dispositionFee: overrides.dispositionFee ?? SOURCES.dispositionFee.value,
    insurancePerYear: overrides.insurancePerYear ?? insuranceEstimate(v, price),
    maintenancePerKm,
    winterTireSet: overrides.winterTireSet ?? factors.winterSet,
    tireSet: overrides.tireSet ?? factors.tireSet,
    tireLifeKm: overrides.tireLifeKm ?? SOURCES.tireLifeKm.value,
    repairsPerYear: overrides.repairsPerYear ?? (v.fuelType === "ev" ? 450 : 600) * (luxury > 1 ? 1.5 : 1),
    warrantyYears: overrides.warrantyYears ?? SOURCES.warrantyYears.value,
    homeChargerCost: overrides.homeChargerCost ?? SOURCES.homeCharger.value,
    phevElectricShare: overrides.phevElectricShare ?? phevElectricShare(v, s),
    retentionYear1,
    retentionYearly,
    ageAtStart,
  };
}

/** Yearly km is needed in a few UI places; re-exported for convenience. */
export { kmPerYear };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}
function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}
