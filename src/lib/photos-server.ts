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

const photos = cached as Record<string, Photo | null>;

const FREE = /^(cc|public domain|pd|cc0)/i;
// Not the version sold in Canada, or not a regular car: other markets, fleet and race cars
const NOT_CANADIAN = /market|china|chinese|japan|jdm|india|brazil|australia|europe|uk\b|thailand|indonesia|mexico|russia|police|ranger|taxi|patrol|ambulance|fire|sheriff|rcmp|rally|racing|race car|\brace\b|nascar|modified|tuned|wrap|livery|prototype|concept|camouflage|mule/i;
// Not a photo of the whole car from outside
const NOT_EXTERIOR = /interior|dashboard|cockpit|engine|motor\b|badge|logo|emblem|wheel|rim|seat|trunk|boot|cargo|detail|charging|charge port|steering|instrument|gauge|display|screen|headlight|taillight|light|grille|key|plate|cutaway|chassis|crash|wreck|accident|toy|model car|lego/i;

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function api(base: string, params: Record<string, string>) {
  const url = `${base}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const res = await fetch(url, { headers: HEADERS, next: { revalidate: MONTH } });
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

/**
 * A Commons photo of this make and model whose file name has a model year within `maxGap` of the vehicle's,
 * the closest year winning. With `withYear`, the search itself asks for that year.
 */
async function yearPhoto(make: string, family: string, year: number, fuelType?: string, maxGap = 1, withYear = true): Promise<Photo | null> {
  const familyWords = family.toLowerCase().split(/\s+/);
  const d = await api(COMMONS, {
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: withYear ? `intitle:${year} intitle:"${family}" ${make}` : `intitle:"${family}" ${make}`,
    gsrlimit: "40",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size",
    iiurlwidth: "640",
  });
  const pages: { title: string; imageinfo?: ImageInfo[] }[] = d?.query?.pages ?? [];
  let best: { score: number; info: ImageInfo } | null = null;
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    const title = p.title.replace(/^File:/, "");
    const lower = title.toLowerCase();
    if (!/\.(jpe?g|png|webp)$/i.test(title) || NOT_EXTERIOR.test(title) || NOT_CANADIAN.test(title) || wrongVersion(title, fuelType)) continue;
    if (!familyWords.every((w) => lower.includes(w)) || !lower.includes(make.toLowerCase().split(" ")[0])) continue;
    if (!info.width || info.width / info.height < 1.2) continue; // landscape only
    const years = (title.match(/\b(19[89]\d|20[0-3]\d)\b/g) ?? []).map(Number);
    const gap = Math.min(...years.map((y) => Math.abs(y - year)));
    if (!(gap <= maxGap)) continue;
    let score = gap === 0 ? 3 : gap === 1 ? 1 : -gap;
    if (/front/i.test(title)) score += 2;
    if (/\b(left|right|side|3\/4|quarter)\b/i.test(title)) score += 1;
    if (/\brear\b|\bback\b/i.test(title)) score -= 2;
    if (!toPhoto(info, "year")) continue; // licence check
    if (!best || score > best.score) best = { score, info };
  }
  if (!best) return null;
  const bestYears = (best.info.descriptionurl.match(/\b(19[89]\d|20[0-3]\d)\b/g) ?? []).map(Number);
  const close = bestYears.some((y) => Math.abs(y - year) <= 1);
  return toPhoto(best.info, close ? "year" : "model");
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
      // Same year (±1); else the nearest year of the same version within 6 years
      const p = (await yearPhoto(make, family, year, fuelType)) ?? (await yearPhoto(make, family, year, fuelType, 6, false));
      if (p) return p;
    }
  } catch (e) {
    console.warn(`[photos] year lookup failed for ${key} ${year}: ${(e as Error).message}`);
  }
  if (key in photos && photos[key] && !wrongVersion(photos[key]!.pageUrl, fuelType)) return { ...photos[key]!, match: "model" };
  try {
    const p = await modelPhoto(make, family, fuelType);
    if (!p) console.warn(`[photos] no free photo for ${key}`);
    return p;
  } catch (e) {
    console.warn(`[photos] lookup failed for ${key}: ${(e as Error).message}`);
    return null;
  }
}
