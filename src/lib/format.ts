import { KM_PER_MI, L_PER_US_GAL, type Units } from "./units";

const cad0 = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const cad2 = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num0 = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 1 });

export const money = (n: number) => cad0.format(Math.round(n)).replace("CA", "");
export const money2 = (n: number) => cad2.format(n).replace("CA", "");
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
export const int = (n: number) => num0.format(n);

export function distance(km: number, units: Units) {
  return units === "km" ? `${num0.format(km)} km` : `${num0.format(km / KM_PER_MI)} mi`;
}

/** $ per km or per mile */
export function perDistance(dollarsPerKm: number, units: Units) {
  return units === "km" ? `${money2(dollarsPerKm)}/km` : `${money2(dollarsPerKm * KM_PER_MI)}/mi`;
}

/** L/100 km, or US mpg in miles mode: mpg = (100 km ÷ L) × (1 mi ÷ 1.609 km) × (3.785 L ÷ 1 gal) = 235.2 ÷ L/100 km */
export function fuelUse(l100: number, units: Units) {
  if (!l100) return "—";
  return units === "km" ? `${num1.format(l100)} L/100 km` : `${num1.format((100 * L_PER_US_GAL) / (KM_PER_MI * l100))} mpg (US)`;
}

/** kWh/100 km, or miles per kWh in miles mode */
export function electricUse(kwh100: number, units: Units) {
  if (!kwh100) return "—";
  return units === "km" ? `${num1.format(kwh100)} kWh/100 km` : `${num1.format(100 / kwh100 / KM_PER_MI)} mi/kWh`;
}
