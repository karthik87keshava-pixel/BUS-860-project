// Finds a free-licence photo of a car on Wikimedia Commons. Results are cached by Next.js for 30 days.
//   1. A photo of the same model year (or one year either side): Commons file names usually start with
//      the year ("2016 Honda Civic EX sedan (front).jpg"). We prefer landscape front or side exterior shots.
//   2. Otherwise the model's general photo: src/data/photos.json (pre-fetched by npm run data:photos), or the
//      lead image of the "<Make> <Model>" Wikipedia article.
// Only Creative Commons or public-domain photos are used; with none, the site draws a body-type outline.
import "server-only";
import cached from "@/data/photos.json";
import type { Photo } from "./vehicle-types";

const WIKIPEDIA = "https://en.wikipedia.org/w/api.php";
const COMMONS = "https://commons.wikimedia.org/w/api.php";
const HEADERS = { "User-Agent": "Fairdrive/1.0 (University of Alberta BUS 860 student project; https://github.com/karthik87keshava-pixel/BUS-860-project)" };
const MONTH = 60 * 60 * 24 * 30;

// Pre-fetched photos per make|model; "year" (when known) is the model year shown, so captions stay accurate
const photos = cached as Record<string, (Photo & { year?: number }) | null>;

const FREE = /^(cc|public domain|pd|cc0)/i;
// Not the version sold in Canada, or not a regular car: other markets, fleet and race cars
const NOT_CANADIAN = /market|china|chinese|japan|jdm|india|brazil|australia|europe|uk\b|thailand|indonesia|mexico|russia|moscow|hong kong|motor show|auto show|mobility show|\bshow\b|salon|gims|expo|police|ranger|taxi|patrol|ambulance|fire|sheriff|rcmp|rally|racing|race car|\brace\b|nascar|modified|tuned|wrap|livery|prototype|concept|camouflage|mule/i;
// Not a photo of the whole car from outside
const NOT_EXTERIOR = /interior|dashboard|brake|caliper|tire|tyre|mirror|door|hood|bonnet|roof rack|cockpit|engine|motor\b|badge|logo|emblem|wheel|rim|seat|trunk|boot|cargo|detail|charging|charge port|steering|instrument|gauge|display|screen|headlight|taillight|light|grille|key|plate|cutaway|chassis|crash|wreck|accident|toy|model car|lego/i;

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function api(base: string, params: Record<string, string>) {
  const url = `${base}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  let res = await fetch(url, { headers: HEADERS, next: { revalidate: MONTH } });
  if (res.status === 429) {
    // Wikimedia asks busy clients to slow down: wait a moment and try once more
    await new Promise((r) => setTimeout(r, 1200));
    res = await fetch(url, { headers: HEADERS, next: { revalidate: MONTH } });
  }
  if (!res.ok) throw new Error(`Wikimedia ${res.status}`);
  return res.json();
}

interface ImageInfo {
  url: string;
  thumburl?: string;
  descriptionurl: string;
  width: number;
  height: number;
  extmetadata?: Record<string, { value?: string }>;
}

function toPhoto(info: ImageInfo, match: Photo["match"]): Photo | null {
  const m = info.extmetadata ?? {};
  const license = stripHtml(m.LicenseShortName?.value ?? "");
  if (!FREE.test(license)) return null;
  return {
    url: info.thumburl ?? info.url,
    pageUrl: info.descriptionurl,
    author: stripHtml(m.Artist?.value ?? "Unknown") || "Unknown",
    license,
    licenseUrl: m.LicenseUrl?.value,
    match,
  };
}

/** Photos of a different version of the model: a plug-in or electric photo for a gas/hybrid car, or the reverse. */
function wrongVersion(rawTitle: string, fuelType?: string) {
  const title = decodeURIComponent(rawTitle).replace(/_/g, " "); // file names use underscores for spaces
  const plugIn = /\bprime\b|plug-?in|\bphev\b|\b4xe\b|e-?hybrid|recharge/i.test(title);
  const electric = /\belectric\b|\bev\b|e-tron|\beq[a-z]?\b/i.test(title);
  if (fuelType === "phev") return electric && !plugIn;
  if (fuelType === "ev") return plugIn;
  return plugIn || electric; // gas, hybrid, diesel
}

/** The model year in a Commons file name: by convention it is written right before the make ("2019 Toyota RAV4 LE…"). */
function modelYearIn(title: string, make: string): number | null {
  const m = new RegExp(`\\b(19[89]\\d|20[0-3]\\d)\\s+${make.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").exec(title);
  return m ? Number(m[1]) : null;
}

/**
 * The best Commons photo of this make and model, closest model year first (searching the exact phrase "2025 Toyota RAV4",
 * then one year either side, then the model without a year). Only years within 6 of the vehicle's count;
 * "year" means within one year, otherwise it is shown as a general model photo.
 */
async function yearPhoto(make: string, family: string, year: number, fuelType?: string): Promise<Photo | null> {
  const familyWords = family.toLowerCase().split(/\s+/);
  const queries = [
    `intitle:"${year} ${make} ${family}"`,
    `intitle:"${year - 1} ${make} ${family}"`,
    `intitle:"${year + 1} ${make} ${family}"`,
    `intitle:"${make} ${family}"${fuelType === "hybrid" ? " intitle:hybrid" : ""}`,
  ];
  let best: { score: number; gap: number; info: ImageInfo } | null = null;
  for (const q of queries) {
    const d = await api(COMMONS, {
      action: "query",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: q,
      gsrlimit: "50",
      prop: "imageinfo",
      iiprop: "url|extmetadata|size",
      iiurlwidth: "640",
    });
    const pages: { title: string; imageinfo?: ImageInfo[] }[] = d?.query?.pages ?? [];
    for (const p of pages) {
      const info = p.imageinfo?.[0];
      if (!info) continue;
      const title = p.title.replace(/^File:/, "");
      const lower = title.toLowerCase();
      if (!/\.(jpe?g|png|webp)$/i.test(title) || NOT_EXTERIOR.test(title) || NOT_CANADIAN.test(title) || wrongVersion(title, fuelType)) continue;
      if (!familyWords.every((w) => lower.includes(w))) continue;
      if (!info.width || info.width / info.height < 1.2) continue; // landscape only
      const y = modelYearIn(title, make);
      if (y === null) continue;
      const gap = Math.abs(y - year);
      if (gap > 6) continue;
      let score = gap === 0 ? 3 : gap === 1 ? 1 : -gap;
      if (/front/i.test(title)) score += 2;
      if (/\b(left|right|side|3\/4|quarter)\b/i.test(title)) score += 1;
      if (/\brear\b|\bback\b|heck/i.test(title)) score -= 2;
      if (fuelType === "hybrid" && /hybrid/i.test(title)) score += 1;
      if (!toPhoto(info, "year")) continue; // licence check
      if (!best || score > best.score) best = { score, gap, info };
    }
    if (best && best.gap <= 1) break; // good enough; skip the wider searches
  }
  return best ? toPhoto(best.info, best.gap <= 1 ? "year" : "model") : null;
}

/** The model's general photo: the lead image of its Wikipedia article (skipped if it shows another version). */
async function modelPhoto(make: string, family: string, fuelType?: string): Promise<Photo | null> {
  let d = await api(WIKIPEDIA, { action: "query", redirects: "1", prop: "pageimages", piprop: "name", titles: `${make} ${family}` });
  let file: string | undefined = d?.query?.pages?.[0]?.pageimage;
  if (!file) {
    d = await api(WIKIPEDIA, { action: "query", generator: "search", gsrsearch: `${make} ${family} car`, gsrlimit: "1", prop: "pageimages", piprop: "name" });
    file = d?.query?.pages?.[0]?.pageimage;
  }
  if (!file || wrongVersion(file, fuelType)) return null;
  d = await api(WIKIPEDIA, { action: "query", prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "640", titles: `File:${file}` });
  const info = d?.query?.pages?.[0]?.imageinfo?.[0];
  return info ? toPhoto(info, "model") : null;
}

export function photoKey(make: string, family: string) {
  return `${make}|${family}`;
}

export async function findPhoto(make: string, family: string, year?: number, fuelType?: string): Promise<Photo | null> {
  const key = photoKey(make, family);
  try {
    if (year) {
      const p = await yearPhoto(make, family, year, fuelType);
      if (p) return p;
    }
  } catch (e) {
    console.warn(`[photos] year lookup failed for ${key} ${year}: ${(e as Error).message}`);
  }
  const stored = photos[key];
  if (stored && !wrongVersion(stored.pageUrl, fuelType)) {
    const { year: shownYear, ...photo } = stored;
    return { ...photo, match: year && shownYear && Math.abs(shownYear - year) <= 1 ? "year" : "model" };
  }
  try {
    const p = await modelPhoto(make, family, fuelType);
    if (!p) console.warn(`[photos] no free photo for ${key}`);
    return p;
  } catch (e) {
    console.warn(`[photos] lookup failed for ${key}: ${(e as Error).message}`);
    return null;
  }
}
