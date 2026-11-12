// The quick questionnaire: each answer fills an input the calculation already has (daily km, city share, years,
// winter months, home charging). Nothing here calculates costs. The values are the team's estimates (see DECISIONS.md).
import type { SharedInputs } from "./calc";

export const DISTANCE = [
  { id: "u20", label: "Under 20 km", hint: "Short trips around town", km: 15 },
  { id: "20-50", label: "20 to 50 km", hint: "A typical commute", km: 35 },
  { id: "50-100", label: "50 to 100 km", hint: "A long commute", km: 75 },
  { id: "o100", label: "Over 100 km", hint: "On the road most of the day", km: 120 },
] as const;

export const TRAFFIC = [
  { id: "rush", label: "Mostly rush hour or city streets", hint: "Stop-and-go, 30 to 50 km/h", cityShare: 0.75, short: "mostly rush hour" },
  { id: "mix", label: "A mix of both", hint: "Some traffic, some open road", cityShare: 0.55, short: "mixed traffic" },
  { id: "open", label: "Mostly off-peak or open highway", hint: "Steady 90 to 110 km/h", cityShare: 0.3, short: "mostly open road" },
] as const;

export const REGIONS = [
  { id: "south", label: "Southern Alberta", hint: "Lethbridge, Medicine Hat", winterMonths: 4 },
  { id: "calgary", label: "Calgary area", hint: "Calgary, Airdrie, Canmore", winterMonths: 5 },
  { id: "edmonton", label: "Edmonton and central Alberta", hint: "Edmonton, Red Deer", winterMonths: 5 },
  { id: "north", label: "Northern Alberta", hint: "Grande Prairie, Fort McMurray", winterMonths: 6 },
] as const;

export const CHARGING = [
  { id: "home", label: "Yes, at home", hint: "A garage or driveway with a plug", homeCharging: true, homeChargeShare: 0.85 },
  { id: "some", label: "Sometimes", hint: "Shared or limited charging at home", homeCharging: true, homeChargeShare: 0.5 },
  { id: "none", label: "No", hint: "Public chargers only", homeCharging: false, homeChargeShare: 0 },
] as const;

/** "mostly rush hour" for the three questionnaire answers, otherwise "65% city". */
export function trafficLabel(cityShare: number): string {
  const t = TRAFFIC.find((x) => Math.abs(x.cityShare - cityShare) < 0.001);
  return t ? t.short : `${Math.round(cityShare * 100)}% city`;
}

export function regionLabel(id: string | undefined, winterMonths: number): string {
  const r = REGIONS.find((x) => x.id === id);
  return r && r.winterMonths === winterMonths ? r.label : `${winterMonths} winter months`;
}

export type SharedPatch = Partial<SharedInputs>;
