// Pre-fetches one free-licence photo per model family from Wikimedia Commons (via the Wikipedia API)
// into src/data/photos.json, and lists the families with no usable photo in docs/photo-coverage.md.
// The website also looks photos up by itself, so this is optional: it makes pages faster and the gaps visible.
// Same rules as src/lib/photos-server.ts: lead image of the "<Make> <Model>" article, Creative Commons or public domain only.
// Run with: npm run data:photos   (slow on purpose: about one request per second, as Wikimedia asks)
import fs from "node:fs";
import { spawnSync } from "node:child_process";

if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
  process.exit(r.status ?? 1);
}

const API = "https://en.wikipedia.org/w/api.php";
const HEADERS = { "User-Agent": "DriveTally/1.0 (University of Alberta BUS 860 student project; https://github.com/karthik87keshava-pixel/BUS-860-project)" };
const FREE = /^(cc|public domain|pd|cc0)/i;
const OUT = "src/data/photos.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function api(params) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    await sleep(1100);
    const res = await fetch(`${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`, { headers: HEADERS });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status}`);
    await sleep(5000 * attempt); // rate-limited: back off
  }
  throw new Error("Wikipedia kept refusing (rate limit)");
}

async function photoFor(make, family) {
  let d = await api({ action: "query", redirects: "1", prop: "pageimages", piprop: "name", titles: `${make} ${family}` });
  let file = d?.query?.pages?.[0]?.pageimage;
  if (!file) {
    d = await api({ action: "query", generator: "search", gsrsearch: `${make} ${family} car`, gsrlimit: "1", prop: "pageimages", piprop: "name" });
    file = d?.query?.pages?.[0]?.pageimage;
  }
  if (!file) return null;
  d = await api({ action: "query", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "640", titles: `File:${file}` });
  const info = d?.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) return null;
  const m = info.extmetadata ?? {};
  const license = strip(m.LicenseShortName?.value ?? "");
  if (!FREE.test(license)) return null;
  return { url: info.thumburl ?? info.url, pageUrl: info.descriptionurl, author: strip(m.Artist?.value ?? "Unknown") || "Unknown", license, licenseUrl: m.LicenseUrl?.value };
}

const vehicles = JSON.parse(fs.readFileSync("src/data/vehicles.json", "utf8"));
const families = [...new Set(vehicles.map((v) => `${v.make}|${v.family}`))].sort();
const photos = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const refresh = process.argv.includes("--all");
let done = 0;
for (const key of families) {
  if (!refresh && key in photos && photos[key]) continue;
  const [make, family] = key.split("|");
  try {
    photos[key] = await photoFor(make, family);
  } catch (e) {
    console.warn(`${key}: ${e.message}`);
    continue; // leave it out so the next run tries again
  }
  if (++done % 20 === 0) {
    fs.writeFileSync(OUT, JSON.stringify(photos, null, 1));
    console.log(`${done} looked up…`);
  }
}
fs.writeFileSync(OUT, JSON.stringify(photos, null, 1));

const missing = families.filter((k) => !photos[k]);
let md = `# Photo coverage\n\nGenerated ${new Date().toISOString().slice(0, 10)} by \`npm run data:photos\`.\n\n`;
md += `${families.length - missing.length} of ${families.length} model families have a free-licence photo from Wikimedia Commons. `;
md += `The others show a body-type outline. Photos show the model, not always the exact year or trim.\n\n## Families without a photo (${missing.length})\n\n`;
md += missing.map((k) => `- ${k.replace("|", " ")}`).join("\n") + "\n";
fs.writeFileSync("docs/photo-coverage.md", md);
console.log(`Photos: ${families.length - missing.length}/${families.length}; missing ${missing.length}`);
