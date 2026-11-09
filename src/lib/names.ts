// Display clean-up for vehicle names. Only what people see changes; IDs and the data stay as they are.
import type { Vehicle } from "./vehicle-types";

const FUEL_LABEL: Record<string, string> = { gas: "Gas", hybrid: "Hybrid", phev: "Plug-in hybrid", ev: "Electric", diesel: "Diesel" };

/**
 * "Model Y Long Range AWD-B (pre-6/11/25)" → "Model Y Long Range AWD"; "Model 3 Premium-I" → "Model 3 Premium".
 * The single-letter codes are Tesla's (factory/version); other makes use dashes in real names (CR-V, Mach-E, GT-R).
 */
export function displayModel(model: string, make?: string): string {
  let m = model.replace(/\s*\(pre-[\d/]+\)/gi, ""); // NRCan's date notes
  if (make === "Tesla") m = m.replace(/([A-Za-z])-[A-Z](?=\s|$|\))/g, "$1");
  return m.replace(/\s{2,}/g, " ").trim();
}

/** "2026 Tesla Model Y Long Range AWD" */
export function displayName(v: Pick<Vehicle, "year" | "make" | "model">): string {
  return `${v.year} ${v.make} ${displayModel(v.model, v.make)}`;
}

/**
 * The spec line under a vehicle name, without repeated words:
 * "Electric · Electric, 221 kW · Automatic, 1-speed · 17.3 kWh/100 km" → "Electric · 221 kW · 17.3 kWh/100 km"
 * "Hybrid · 2.5 L 4-cyl hybrid · CVT · 5.5 L/100 km" → "Hybrid · 2.5 L 4-cyl · CVT · 5.5 L/100 km"
 */
export function specLine(v: Pick<Vehicle, "fuelType" | "version">): string {
  const parts = v.version.replace(" (US EPA)", "").split(" · ").slice(1);
  const cleaned = parts
    .map((p) => p.replace(/^Electric,\s*/, "").replace(/^Electric$/, "").replace(/\s+(plug-in hybrid|hybrid|diesel)$/i, ""))
    .filter((p) => p && !(v.fuelType === "ev" && /^Automatic, 1-speed$/.test(p)));
  return [FUEL_LABEL[v.fuelType] ?? v.fuelType, ...cleaned].join(" · ");
}

/** Short names for summaries and the chart: "Toyota RAV4", with the payment option added when two columns share a model. */
export function shortNames(cols: { v: Pick<Vehicle, "year" | "make" | "family">; payment: string }[]): string[] {
  const base = cols.map((c) => `${c.v.make} ${c.v.family}`);
  return base.map((b, i) => {
    const same = base.filter((x) => x === b).length > 1;
    if (!same) return b;
    const sameYear = cols.filter((c, j) => base[j] === b && c.v.year === cols[i].v.year).length > 1;
    return sameYear ? `${b} (${cols[i].payment})` : `${cols[i].v.year} ${b}`;
  });
}
