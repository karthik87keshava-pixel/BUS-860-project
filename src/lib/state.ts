// The comparison "state": everything needed to rebuild a comparison. It is saved as-is in the database
// and packed into share links, so opening either later recalculates with exactly the same settings.
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { Overrides, Payment, SharedInputs } from "./calc";

export interface ColumnState {
  vehicleId: string;
  payment: Payment;
  overrides: Overrides; // only the numbers the user changed
}

export interface ComparisonState {
  v: 1;
  shared: Partial<SharedInputs>; // only the shared inputs the user changed
  columns: ColumnState[];
}

export const MAX_COLUMNS = 4;

export const emptyState = (): ComparisonState => ({ v: 1, shared: {}, columns: [] });

export function encodeState(s: ComparisonState): string {
  return compressToEncodedURIComponent(JSON.stringify(s));
}

export function decodeState(text: string | null | undefined): ComparisonState | null {
  if (!text) return null;
  try {
    const s = JSON.parse(decompressFromEncodedURIComponent(text) ?? "");
    if (s && s.v === 1 && Array.isArray(s.columns)) {
      return { v: 1, shared: s.shared ?? {}, columns: s.columns.slice(0, MAX_COLUMNS) };
    }
  } catch {
    // fall through
  }
  return null;
}
