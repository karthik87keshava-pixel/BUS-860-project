// The home page example: a 2025 Toyota RAV4 Hybrid AWD and a 2025 Tesla Model Y Long Range, both on a loan,
// with the default driving settings. Results come from the normal calculation module; nothing is hard-coded.
import "server-only";
import { compressToEncodedURIComponent } from "lz-string";
import { calculateColumn, defaultShared, lowestCost, resolveColumn } from "./calc";
import { displayName, shortNames } from "./names";
import { findPhoto } from "./photos-server";
import type { ComparisonState } from "./state";
import { getVehicle } from "./vehicles-server";

const EXAMPLE_IDS = ["D-Utv73ImU", "XcHLgQHwcR"]; // 2025 RAV4 Hybrid AWD, 2025 Model Y Long Range (src/data/vehicles.json)
const CURRENT_YEAR = 2026;

export function exampleHref(): string {
  const state: ComparisonState = { v: 1, shared: {}, columns: EXAMPLE_IDS.map((vehicleId) => ({ vehicleId, payment: "loan", overrides: {} })) };
  return `/compare?s=${compressToEncodedURIComponent(JSON.stringify(state))}`;
}

export async function exampleCards() {
  const shared = defaultShared(CURRENT_YEAR);
  const vehicles = EXAMPLE_IDS.map((id) => getVehicle(id)).filter((v) => v !== undefined);
  const results = vehicles.map((v) => calculateColumn(v, shared, resolveColumn(v, shared, "loan")));
  const lowest = lowestCost(results);
  const short = shortNames(vehicles.map((v) => ({ v, payment: "loan" })));
  const photos = await Promise.all(vehicles.map((v) => findPhoto(v.make, v.family, v.year, v.fuelType)));
  return {
    years: shared.years,
    cards: vehicles.map((v, i) => ({
      name: displayName(v),
      short: short[i],
      body: v.body,
      photo: photos[i],
      netCost: results[i].netCost,
      perMonth: results[i].perMonth,
      isLowest: lowest?.index === i,
    })),
  };
}
