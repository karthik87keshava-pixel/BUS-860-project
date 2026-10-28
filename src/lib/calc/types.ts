// Shared types for the DriveTally calculation module.
// All money is in Canadian dollars, all distances in km, all fuel use in L/100 km or kWh/100 km.

export type FuelType = "gas" | "hybrid" | "phev" | "ev" | "diesel";
export type FuelGrade = "regular" | "premium" | "diesel" | "electricity";
export type Payment = "loan" | "lease" | "cash";
export type Condition = "new" | "used";
export type ClassBucket =
  | "car-small"
  | "car-compact"
  | "car-mid"
  | "car-large"
  | "sports"
  | "suv-small"
  | "suv-large"
  | "pickup-small"
  | "pickup-large"
  | "van";

/** The vehicle facts the maths needs (a subset of a row in src/data/vehicles.json). */
export interface VehicleFacts {
  id: string;
  year: number;
  make: string;
  model: string;
  family: string;
  fuelType: FuelType;
  fuelGrade: FuelGrade;
  classBucket: ClassBucket;
  cityL?: number | null; // L/100 km (gas, hybrid, diesel, and PHEV running on gas)
  hwyL?: number | null;
  cityKwh?: number | null; // kWh/100 km (EV, and PHEV running on the battery)
  hwyKwh?: number | null;
  electricRangeKm?: number | null; // PHEV only
  cdL?: number | null; // PHEV: litres of gas still used per 100 km while on the battery
  msrp: number; // base MSRP for this model year
  latestFamilyYear?: number; // newest model year of this family in the data (decides new vs used)
}

/** Inputs shared by every column (left panel). */
export interface SharedInputs {
  kmMode: "daily" | "yearly";
  kmPerDay: number;
  daysPerWeek: number;
  kmPerYear: number; // used when kmMode = "yearly"
  cityShare: number; // 0..1
  years: number; // 1..8
  winterMonths: number; // 0..12
  homeCharging: boolean;
  homeChargeShare: number; // 0..1, share of EV/PHEV charging done at home
  parkingPerMonth: number;
  gasRegular: number; // $/L
  gasPremium: number;
  diesel: number;
  fuelIncrease: number; // yearly change, e.g. 0.02
  electricityHome: number; // $/kWh, all-in
  electricityPublic: number; // $/kWh, DC fast charging
  electricityIncrease: number;
  registrationPerYear: number;
  evAnnualTax: number; // Alberta EV tax, battery-electric only
  insuranceIncrease: number;
  winterPenaltyGas: number; // extra fuel used in winter months, e.g. 0.15 = +15%
  winterPenaltyHybrid: number;
  winterPenaltyEv: number; // extra electricity used in winter months
  includeCashPrice: boolean; // team rule: cash purchase price is a sunk cost unless this is on
  currentYear: number; // the year purchases happen (sets vehicle age for used cars and rebate amounts)
}

/** Everything a single column needs once defaults are filled in. Every field can be overridden by the user. */
export interface ColumnInputs {
  payment: Payment;
  condition: Condition;
  price: number; // MSRP if new, estimated used price if used
  freightPdi: number;
  docFee: number;
  levies: number; // federal A/C excise tax + Alberta tire levy
  luxuryTax: number;
  rebate: number; // federal EVAP rebate (0 if not eligible)
  downPayment: number;
  tradeIn: number;
  // loan
  apr: number; // e.g. 0.066
  loanTermMonths: number;
  // lease
  leaseRate: number;
  leaseTermMonths: number;
  residualPct: number; // of MSRP
  kmAllowancePerYear: number;
  excessKmRate: number; // $ per km over allowance
  acquisitionFee: number;
  dispositionFee: number;
  // running costs
  insurancePerYear: number;
  maintenancePerKm: number;
  winterTireSet: number; // winter tires on rims, bought at the start
  tireSet: number; // replacement set of tires
  tireLifeKm: number;
  repairsPerYear: number; // reserve once the basic warranty ends
  warrantyYears: number;
  homeChargerCost: number; // one-time, EV/PHEV with home charging
  phevElectricShare: number; // 0..1 of km driven on the battery
  // value over time: share of the original MSRP kept after t years
  retentionYear1: number;
  retentionYearly: number;
  ageAtStart: number; // years old when acquired (0 if new)
}

export interface YearRow {
  year: number;
  km: number;
  energy: number;
  insurance: number;
  maintenance: number;
  tires: number;
  repairs: number;
  registration: number;
  parking: number;
  charger: number;
  running: number; // sum of the above
}

export interface ColumnResult {
  payment: Payment;
  months: number;
  totalKm: number;
  // Getting the car
  price: number;
  freightPdi: number;
  docFee: number;
  levies: number;
  luxuryTax: number;
  gst: number;
  rebate: number;
  downPayment: number;
  tradeIn: number;
  upfront: number; // cash paid at the start (down payment + GST on it for lease, full price for cash)
  // Financing
  monthlyPayment: number; // incl. GST for leases
  paymentsInPeriod: number;
  interestPaid: number;
  leaseFees: number;
  excessKmCharge: number;
  // End of period
  loanBalanceAtEnd: number;
  resaleValue: number; // 0 for leases and for cash when price is excluded
  leaseBuyout: number; // lease only, NOT added to the total
  // Totals
  ownershipCost: number; // getting + financing + end-of-period payments (no running costs)
  runningCost: number;
  totalCost: number; // ownershipCost + runningCost
  netCost: number; // totalCost - resaleValue
  perMonth: number; // netCost / months
  perKm: number; // netCost / totalKm
  priceExcluded: boolean; // cash column with "include purchase price" off
  years: YearRow[];
  cumulative: number[]; // cost to date if the period ended at the end of each year (index 0 = year 1)
  notes: string[];
}
