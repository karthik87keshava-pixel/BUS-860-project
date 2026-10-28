import type { VehicleFacts } from "./calc";

/** One row of src/data/vehicles.json. */
export interface Vehicle extends VehicleFacts {
  nrcanClass: string;
  transmission: string;
  engineL: number | null;
  cylinders: number | null;
  motorKw: number | null;
  combL?: number | null;
  combKwh?: number | null;
  rangeKm?: number | null;
  body: "sedan" | "suv" | "truck" | "hatchback" | "van" | "wagon" | "coupe" | "convertible";
  drive: "AWD/4WD" | "2WD";
  version: string;
  epaCheck: "exact" | "close" | "none";
  msrpStatus: "verified" | "estimate";
  msrpBasis: string;
  msrpSource?: string;
  msrpSourceUrl?: string;
  msrpChecked?: string;
}

export interface Photo {
  url: string; // ~640px wide image on upload.wikimedia.org
  pageUrl: string; // Wikimedia Commons file page
  author: string; // photographer, plain text
  license: string; // e.g. "CC BY-SA 4.0"
  licenseUrl?: string;
}
