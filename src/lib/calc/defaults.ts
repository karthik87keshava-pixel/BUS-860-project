// Alberta default values. Every number here is editable on the site and is listed, with its source,
// on the "How we calculate" page. "checked" is the date we last looked at the source.
// Status: "sourced" = taken from the named source; "estimate" = our judgment, explained in the note.

import type { ClassBucket, FuelType, SharedInputs } from "./types";

export interface Sourced<T> {
  value: T;
  label: string;
  status: "sourced" | "estimate";
  source: string;
  url?: string;
  checked: string;
  note?: string;
}

const CHECKED = "2026-10-28";

export const SOURCES = {
  kmPerDay: {
    value: 40,
    label: "Kilometres per driving day",
    status: "estimate",
    source: "DriveTally default",
    checked: CHECKED,
    note: "40 km a day, 7 days a week is about 14,600 km a year, close to typical Canadian driving. Change it to match your own.",
  },
  daysPerWeek: { value: 7, label: "Days driven per week", status: "estimate", source: "DriveTally default", checked: CHECKED },
  cityShare: { value: 0.55, label: "Share of city driving", status: "estimate", source: "Team brief (55% city)", checked: CHECKED },
  years: { value: 5, label: "Ownership period (years)", status: "estimate", source: "Team brief", checked: CHECKED },
  winterMonths: { value: 5, label: "Winter months per year", status: "estimate", source: "Team brief (Alberta: about November to March)", checked: CHECKED },
  gasRegular: {
    value: 1.55,
    label: "Regular gasoline ($/L)",
    status: "sourced",
    source: "Pump Price Canada, Edmonton and Calgary September 2026 averages (151.2¢ and 156.0¢)",
    url: "https://pumppricecanada.com/en/",
    checked: CHECKED,
    note: "Alberta suspended its 13¢/L fuel tax on October 1, 2026; daily prices in late October swung between about $1.50 and $1.70.",
  },
  gasPremium: {
    value: 1.8,
    label: "Premium gasoline ($/L)",
    status: "estimate",
    source: "Regular price plus about 25¢, in line with Edmonton premium averages reported July–October 2026",
    url: "https://www.globalpetrolprices.com/Canada/Edmonton/gasoline_prices/",
    checked: CHECKED,
  },
  diesel: { value: 1.65, label: "Diesel ($/L)", status: "estimate", source: "DriveTally estimate (about 10¢ above regular)", checked: CHECKED },
  fuelIncrease: { value: 0.02, label: "Yearly fuel price increase", status: "estimate", source: "DriveTally estimate, close to the Bank of Canada 2% inflation target", checked: CHECKED },
  electricityHome: {
    value: 0.23,
    label: "Home electricity, all-in ($/kWh)",
    status: "sourced",
    source: "Alberta all-in residential average including delivery and transmission (about 22.9¢/kWh, 2025–2026)",
    url: "https://greenbuildingcanada.ca/alberta-electricity-rates/",
    checked: CHECKED,
    note: "The Rate of Last Resort energy charge alone is about 12¢/kWh to Dec 31, 2026; delivery, transmission and fees roughly double it.",
  },
  electricityPublic: {
    value: 0.6,
    label: "Public fast charging ($/kWh)",
    status: "sourced",
    source: "Electrify Canada Alberta rate ($0.60/kWh) reported by Drive Tesla Canada; other networks range about $0.35–$0.75",
    url: "https://ev.care/ev-charging-cost/ca/alberta",
    checked: CHECKED,
  },
  electricityIncrease: { value: 0.02, label: "Yearly electricity price increase", status: "estimate", source: "DriveTally estimate", checked: CHECKED },
  homeChargeShare: { value: 0.85, label: "Share of charging done at home", status: "estimate", source: "DriveTally estimate for owners with a home charger", checked: CHECKED },
  registrationPerYear: {
    value: 93,
    label: "Alberta registration ($/year)",
    status: "sourced",
    source: "Alberta passenger vehicle registration, about $93/year (news reports on the EV tax, 2024–2025)",
    url: "https://www.alberta.ca/vehicle-registration.aspx",
    checked: CHECKED,
    note: "Registry agents may add a service fee; online renewals add $13.",
  },
  evAnnualTax: {
    value: 200,
    label: "Alberta EV tax ($/year, battery-electric only)",
    status: "sourced",
    source: "Government of Alberta, in force since February 13, 2025; hybrids and plug-in hybrids exempt",
    url: "https://dailyhive.com/edmonton/alberta-200-annual-electric-vehicle-tax-begins",
    checked: CHECKED,
  },
  insuranceAverage: {
    value: 1903,
    label: "Alberta average premium ($/year)",
    status: "sourced",
    source: "Alberta Automobile Insurance Rate Board, 2026 Market and Trends Report (2025 average)",
    url: "https://westernfinancialgroup.ca/What-Is-the-Average-Cost-of-Car-Insurance-in-Alberta-in-2026",
    checked: CHECKED,
    note: "Real quotes vary a lot with driver age, record, postal code and coverage. Alberta's insurance system changes in 2027.",
  },
  insuranceIncrease: { value: 0.03, label: "Yearly insurance increase", status: "estimate", source: "DriveTally estimate (Alberta premiums rose 8.7% in 2025)", checked: CHECKED },
  winterPenaltyGas: {
    value: 0.15,
    label: "Extra gas used in winter",
    status: "sourced",
    source: "NRCan (citing US EPA): 12–28% more fuel on city trips when it drops from 24°C to 7°C",
    url: "https://natural-resources.canada.ca/sites/www.nrcan.gc.ca/files/oee/pdf/transportation/fuel-efficient-technologies/autosmart_factsheet_3_e.pdf",
    checked: CHECKED,
  },
  winterPenaltyHybrid: { value: 0.2, label: "Extra fuel used by hybrids in winter", status: "estimate", source: "DriveTally estimate (hybrids lose more of their advantage in the cold)", checked: CHECKED },
  winterPenaltyEv: {
    value: 0.35,
    label: "Extra electricity used in winter",
    status: "sourced",
    source: "CAA winter test (14–39% range loss at −7 to −15°C) and Recurrent (about 30% average loss)",
    url: "https://sustainablebiz.ca/evs-lose-up-to-39-of-range-in-cold-weather-tests-caa",
    checked: CHECKED,
    note: "A 26% range loss means about 35% more energy per km.",
  },
  loanApr: {
    value: 0.066,
    label: "New-car loan rate (APR)",
    status: "sourced",
    source: "Bank of Canada chartered bank auto loan rate, about 6.6% (spring 2026)",
    url: "https://loanscanada.ca/auto/what-is-the-average-car-loan-interest-rate-in-canada/",
    checked: CHECKED,
  },
  usedLoanApr: { value: 0.103, label: "Used-car loan rate (APR)", status: "sourced", source: "Same source, used-car average about 10.3%", url: "https://loanscanada.ca/auto/what-is-the-average-car-loan-interest-rate-in-canada/", checked: CHECKED },
  loanTermMonths: { value: 72, label: "Loan term (months)", status: "estimate", source: "DriveTally default (72 and 84 months are common in Canada)", checked: CHECKED },
  leaseRate: { value: 0.0499, label: "Lease rate", status: "estimate", source: "DriveTally estimate; brand promotions in 2026 range from about 3% to 7%", checked: CHECKED },
  kmAllowancePerYear: { value: 20000, label: "Lease km allowance per year", status: "estimate", source: "Common Canadian lease allowance", checked: CHECKED },
  excessKmRate: { value: 0.12, label: "Excess km charge ($/km)", status: "estimate", source: "Typical 8–16¢/km in Canadian leases", checked: CHECKED },
  acquisitionFee: { value: 650, label: "Lease acquisition fee", status: "estimate", source: "Typical Canadian lease registration/acquisition fee", checked: CHECKED },
  dispositionFee: { value: 400, label: "Lease disposition fee", status: "estimate", source: "Typical end-of-lease fee", checked: CHECKED },
  freightPdi: {
    value: 2200,
    label: "Freight and PDI (new cars)",
    status: "sourced",
    source: "Typical $1,600–$2,500 set by the maker (finder.ca); e.g. $2,095 Mazda, $1,850 Nissan in 2026",
    url: "https://www.finder.com/ca/after-purchase-car-costs",
    checked: CHECKED,
  },
  docFee: { value: 599, label: "Dealer documentation fee", status: "estimate", source: "Typical $300–$1,000, includes the $6.25 AMVIC levy", url: "https://www.finder.com/ca/after-purchase-car-costs", checked: CHECKED },
  levies: { value: 116, label: "Federal A/C tax and Alberta tire levy", status: "estimate", source: "Federal air-conditioner excise tax ($100) plus Alberta tire recycling fee (4 × $4)", checked: CHECKED },
  gstRate: { value: 0.05, label: "GST", status: "sourced", source: "Alberta has 5% GST and no PST", checked: CHECKED },
  luxuryTaxThreshold: {
    value: 100000,
    label: "Federal luxury tax threshold",
    status: "sourced",
    source: "Select Luxury Items Tax Act: lesser of 10% of the price or 20% of the amount above $100,000",
    url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/ltn2/subject-vehicles-under-select-luxury-items-tax-act.html",
    checked: CHECKED,
  },
  evap: {
    value: { ev: 5000, phev: 2500, cap: 50000, from2027: { ev: 4000, phev: 2000 } },
    label: "Federal EV rebate (EVAP)",
    status: "sourced",
    source: "Transport Canada, Electric Vehicle Affordability Program: up to $5,000 (EV) / $2,500 (PHEV) in 2026, final price $50,000 or less (no cap for Canadian-made), made in Canada or a free-trade partner, one per person",
    url: "https://tc.canada.ca/en/road-transportation/innovative-technologies/electric-vehicles/electric-vehicle-affordability-program/overview",
    checked: CHECKED,
    note: "Leases of 48+ months get the full amount, shorter leases less (we use 75% / 50% / 25% for 36 / 24 / 12 months, from dealer guides). Alberta has no provincial EV rebate. Check eligibility for your exact car.",
  },
  homeCharger: { value: 2000, label: "Home Level 2 charger, installed", status: "estimate", source: "DriveTally estimate: charger about $700–$1,000 plus installation", checked: CHECKED },
  tireLifeKm: { value: 60000, label: "Tire life (km)", status: "estimate", source: "DriveTally estimate", checked: CHECKED },
  warrantyYears: { value: 3, label: "Basic warranty (years)", status: "estimate", source: "Most makers: 3 years / 60,000 km bumper-to-bumper", checked: CHECKED },
  retention: {
    value: { year1: 0.78, yearly: 0.89, after5: 0.03 },
    label: "Value kept over time",
    status: "sourced",
    source: "Canadian Black Book: vehicles keep about 72–80% after 1 year, 52–61% after 3 and 40–45% after 5",
    url: "https://www.canadianblackbook.com/mastering-modern-auto-valuation-expert-tips-for-data-driven-depreciation-leasing-strategies-in-canada/",
    checked: CHECKED,
    note: "Our curve: 78% after year 1, then 11% less each year to year 5 (62% at 3 years, 49% at 5; CBB also reports the average 4-year-old keeps 57%), then 8% less each year after that, because older cars lose value more slowly. Brand and fuel adjustments are estimates.",
  },
} satisfies Record<string, Sourced<unknown>>;

/** The default shared inputs a new comparison starts with. */
export function defaultShared(currentYear = 2026): SharedInputs {
  return {
    kmMode: "daily",
    kmPerDay: SOURCES.kmPerDay.value,
    daysPerWeek: SOURCES.daysPerWeek.value,
    kmPerYear: 15000,
    cityShare: SOURCES.cityShare.value,
    years: SOURCES.years.value,
    winterMonths: SOURCES.winterMonths.value,
    homeCharging: true,
    homeChargeShare: SOURCES.homeChargeShare.value,
    parkingPerMonth: 0,
    gasRegular: SOURCES.gasRegular.value,
    gasPremium: SOURCES.gasPremium.value,
    diesel: SOURCES.diesel.value,
    fuelIncrease: SOURCES.fuelIncrease.value,
    electricityHome: SOURCES.electricityHome.value,
    electricityPublic: SOURCES.electricityPublic.value,
    electricityIncrease: SOURCES.electricityIncrease.value,
    registrationPerYear: SOURCES.registrationPerYear.value,
    evAnnualTax: SOURCES.evAnnualTax.value,
    insuranceIncrease: SOURCES.insuranceIncrease.value,
    winterPenaltyGas: SOURCES.winterPenaltyGas.value,
    winterPenaltyHybrid: SOURCES.winterPenaltyHybrid.value,
    winterPenaltyEv: SOURCES.winterPenaltyEv.value,
    includeCashPrice: false,
    currentYear,
  };
}

// ---------- per-vehicle default tables (estimates, explained on "How we calculate") ----------

/** Maintenance in $ per km by fuel type (ThinkEV 2026: EV about $500–800/yr vs gas $1,000–1,500/yr at ~15,000–20,000 km). */
export const MAINTENANCE_PER_KM: Record<FuelType, number> = { gas: 0.07, diesel: 0.08, hybrid: 0.065, phev: 0.06, ev: 0.04 };
export const MAINTENANCE_SOURCE = {
  source: "ThinkEV Canada 2026 maintenance guide; CAA Driving Costs calculator used as a cross-check",
  url: "https://thinkev.ca/blog/ev-maintenance-costs-canada-what-you-actually-pay",
};

/** Bigger vehicles cost more to maintain and to put tires on. */
export const CLASS_FACTORS: Record<ClassBucket, { maintenance: number; insurance: number; winterSet: number; tireSet: number }> = {
  "car-small": { maintenance: 1, insurance: 1, winterSet: 1300, tireSet: 800 },
  "car-compact": { maintenance: 1, insurance: 1, winterSet: 1400, tireSet: 900 },
  "car-mid": { maintenance: 1, insurance: 1, winterSet: 1500, tireSet: 1000 },
  "car-large": { maintenance: 1.1, insurance: 1, winterSet: 1700, tireSet: 1100 },
  sports: { maintenance: 1.2, insurance: 1.25, winterSet: 2000, tireSet: 1400 },
  "suv-small": { maintenance: 1.05, insurance: 1, winterSet: 1700, tireSet: 1100 },
  "suv-large": { maintenance: 1.2, insurance: 1.05, winterSet: 2000, tireSet: 1300 },
  "pickup-small": { maintenance: 1.1, insurance: 1.05, winterSet: 1900, tireSet: 1200 },
  "pickup-large": { maintenance: 1.2, insurance: 1.05, winterSet: 2200, tireSet: 1500 },
  van: { maintenance: 1.15, insurance: 0.95, winterSet: 1800, tireSet: 1200 },
};

/** Brands that cost more to service (luxury and exotic). */
export const LUXURY_MAKES = new Set([
  "Acura", "Alfa Romeo", "Aston Martin", "Audi", "BMW", "Bentley", "Bugatti", "Cadillac", "Ferrari", "Genesis", "INEOS", "Infiniti",
  "Jaguar", "Karma", "Lamborghini", "Land Rover", "Lexus", "Lincoln", "Lotus", "Lucid", "Maserati", "Mercedes-Benz", "Polestar",
  "Porsche", "Rolls-Royce", "Volvo",
]);

/**
 * Depreciation adjustments (estimates). Canadian Black Book's yearly "best retained value" winners are mostly Toyota, Lexus,
 * Honda, Subaru, Porsche and pickups; European luxury brands and EVs lose value faster.
 */
export const STRONG_RESALE_MAKES = new Set(["Toyota", "Lexus", "Honda", "Subaru", "Porsche", "Jeep"]);
export const WEAK_RESALE_MAKES = new Set([
  "Alfa Romeo", "Audi", "BMW", "Cadillac", "Fisker", "Genesis", "Infiniti", "Jaguar", "Land Rover", "Lincoln", "Maserati",
  "Mercedes-Benz", "Mitsubishi", "VinFast", "Volvo",
]);
