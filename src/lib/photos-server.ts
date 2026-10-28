// Finds a free-licence photo of a car on Wikimedia Commons, through the Wikipedia API.
//   1. src/data/photos.json (pre-fetched by npm run data:photos) is checked first.
//   2. Otherwise we ask Wikipedia for the lead image of the model's article, then read the photographer
//      and licence from the file page. Results are cached by Next.js for 30 days.
// Only freely licensed photos (Creative Commons or public domain) are used; anything else falls back
// to a body-type outline drawn by the site.
import "server-only";
import cached from "@/data/photos.json";
import type { Photo } from "./vehicle-types";

const API = "https://en.wikipedia.org/w/api.php";
const HEADERS = { "User-Agent": "DriveTally/1.0 (University of Alberta BUS 860 student project; https://github.com/karthik87keshava-pixel/BUS-860-project)" };
const MONTH = 60 * 60 * 24 * 30;

const photos = cached as Record<string, Photo | null>;

const FREE = /^(cc|public domain|pd|cc0)/i;

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function api(params: Record<string, string>) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const res = await fetch(url, { headers: HEADERS, next: { revalidate: MONTH } });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return res.json();
}

async function leadImage(title: string): Promise<string | null> {
  const d = await api({ action: "query", redirects: "1", prop: "pageimages", piprop: "name", titles: title });
  const page = d?.query?.pages?.[0];
  return page && !page.missing && page.pageimage ? page.pageimage : null;
}

async function searchImage(q: string): Promise<string | null> {
  const d = await api({ action: "query", generator: "search", gsrsearch: q, gsrlimit: "1", prop: "pageimages", piprop: "name" });
  const page = d?.query?.pages?.[0];
  return page?.pageimage ?? null;
}

async function fileInfo(file: string): Promise<Photo | null> {
  const d = await api({ action: "query", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "640", titles: `File:${file}` });
  const info = d?.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) return null;
  const m = info.extmetadata ?? {};
  const license = stripHtml(m.LicenseShortName?.value ?? "");
  if (!FREE.test(license)) return null;
  return {
    url: info.thumburl ?? info.url,
    pageUrl: info.descriptionurl,
    author: stripHtml(m.Artist?.value ?? "Unknown") || "Unknown",
    license,
    licenseUrl: m.LicenseUrl?.value,
  };
}

export function photoKey(make: string, family: string) {
  return `${make}|${family}`;
}

export async function findPhoto(make: string, family: string): Promise<Photo | null> {
  const key = photoKey(make, family);
  if (key in photos) return photos[key];
  try {
    const file = (await leadImage(`${make} ${family}`)) ?? (await searchImage(`${make} ${family} car`));
    const photo = file ? await fileInfo(file) : null;
    if (!photo) console.warn(`[photos] no free photo for ${key}`);
    return photo;
  } catch (e) {
    console.warn(`[photos] lookup failed for ${key}: ${(e as Error).message}`);
    return null;
  }
}
