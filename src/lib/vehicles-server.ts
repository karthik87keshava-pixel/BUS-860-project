// Server-only access to the vehicle list (src/data/vehicles.json, built by npm run data:refresh).
// Loaded once per server instance; search runs in memory, which is fast for ~17,600 rows.
import "server-only";
import raw from "@/data/vehicles.json";
import type { Vehicle } from "./vehicle-types";

const vehicles = raw as unknown as Vehicle[];
const byId = new Map(vehicles.map((v) => [v.id, v]));

// Words we search in, e.g. ["2024","honda","civic","hatchback","2.0","l","4","cyl","cvt","hybrid"]
const words = vehicles.map((v) =>
  `${v.year} ${v.make} ${v.family} ${v.model} ${v.fuelType === "ev" ? "ev electric" : v.fuelType === "phev" ? "phev plug-in hybrid" : v.fuelType === "hybrid" ? "hybrid" : v.fuelType} ${v.body} ${v.body === "truck" ? "pickup" : ""}`
    .toLowerCase()
    .split(/[\s\-/()·]+/)
    .filter(Boolean)
    // also "f150" for "F-150", "cx5" for "CX-5"
    .concat(`${v.family} ${v.model}`.toLowerCase().split(/\s+/).filter((x) => x.includes("-")).map((x) => x.replace(/-/g, ""))),
);

export function getVehicle(id: string): Vehicle | undefined {
  return byId.get(id);
}

export interface SearchHit {
  id: string;
  year: number;
  make: string;
  family: string;
  model: string;
  version: string;
  fuelType: Vehicle["fuelType"];
  msrp: number;
}

const hit = (v: Vehicle): SearchHit => ({
  id: v.id,
  year: v.year,
  make: v.make,
  family: v.family,
  model: v.model,
  version: v.version,
  fuelType: v.fuelType,
  msrp: v.msrp,
});

/** Type-ahead search: every word typed must start a word in the vehicle's name (e.g. "2024 civic hybrid"). Newest first. */
export function searchVehicles(q: string, limit = 30): SearchHit[] {
  const query = q.toLowerCase().split(/[\s\-/()·]+/).filter(Boolean);
  if (!query.length) return [];
  const out: SearchHit[] = [];
  for (let i = 0; i < vehicles.length && out.length < limit; i++) {
    const w = words[i];
    if (query.every((t) => (/^\d{4}$/.test(t) ? w[0] === t : w.some((x) => x.startsWith(t))))) out.push(hit(vehicles[i]));
  }
  return out;
}

/** Options for the step-by-step pickers: Year → Make → Model (family) → Version. */
export function pickerOptions(year?: number, make?: string, family?: string) {
  if (!year) return { years: [...new Set(vehicles.map((v) => v.year))].sort((a, b) => b - a) };
  const inYear = vehicles.filter((v) => v.year === year);
  if (!make) return { makes: [...new Set(inYear.map((v) => v.make))].sort((a, b) => a.localeCompare(b)) };
  const inMake = inYear.filter((v) => v.make === make);
  if (!family) return { families: [...new Set(inMake.map((v) => v.family))].sort((a, b) => a.localeCompare(b)) };
  return {
    versions: inMake
      .filter((v) => v.family === family)
      .sort((a, b) => a.msrp - b.msrp)
      .map(hit),
  };
}

export const DATA_INFO = {
  count: vehicles.length,
  makes: new Set(vehicles.map((v) => v.make)).size,
  families: new Set(vehicles.map((v) => `${v.make}|${v.family}`)).size,
  verifiedPrices: vehicles.filter((v) => v.msrpStatus === "verified").length,
  byFuel: vehicles.reduce<Record<string, number>>((a, v) => ((a[v.fuelType] = (a[v.fuelType] ?? 0) + 1), a), {}),
  firstYear: Math.min(...vehicles.map((v) => v.year)),
  lastYear: Math.max(...vehicles.map((v) => v.year)),
};
