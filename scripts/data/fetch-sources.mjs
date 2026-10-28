// Downloads the raw vehicle data into data/raw/ (not committed to GitHub).
//   - NRCan Fuel Consumption Ratings, through the open.canada.ca data API
//   - US EPA fueleconomy.gov vehicles file (used to cross-check and flag hybrids)
// Run with: npm run data:fetch
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

// Node's built-in fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY is set; restart with it when behind a proxy.
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
  process.exit(r.status ?? 1);
}

const RAW = path.resolve("data/raw");
const DATASET = "98f1a129-f628-4ce4-b24d-6f16bf24dd64";
const API = "https://open.canada.ca/data/api/action";

// The English CSV tables we use. Found by name, so new year files get picked up automatically.
const WANTED = [/battery-electric/i, /plug-in hybrid/i, /^\d{4} Fuel Consumption Ratings/i, /^\d{4}-\d{4} Fuel Consumption Ratings/i];

async function getJson(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "DriveTally-data-refresh (UAlberta BUS 860 project)" } });
    if (res.ok) return res.json();
    if (attempt === 4) throw new Error(`${res.status} for ${url}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

async function fetchNrcan() {
  const pkg = (await getJson(`${API}/package_show?id=${DATASET}`)).result;
  const resources = pkg.resources.filter(
    (r) => r.format === "CSV" && String(r.language).includes("en") && WANTED.some((re) => re.test(r.name)) && !/original/i.test(r.name),
  );
  const manifest = { fetchedAt: new Date().toISOString(), datasetUrl: `https://open.canada.ca/data/en/dataset/${DATASET}`, files: [] };
  for (const r of resources) {
    const records = [];
    let offset = 0;
    for (;;) {
      const page = (await getJson(`${API}/datastore_search?resource_id=${r.id}&limit=5000&offset=${offset}`)).result;
      records.push(...page.records);
      offset += page.records.length;
      if (page.records.length === 0 || offset >= page.total) break;
    }
    const file = `nrcan-${r.id}.json`;
    fs.writeFileSync(path.join(RAW, file), JSON.stringify(records));
    manifest.files.push({ name: r.name, id: r.id, lastModified: r.last_modified || r.metadata_modified, rows: records.length, file });
    console.log(`NRCan: ${r.name} → ${records.length} rows`);
  }
  fs.writeFileSync(path.join(RAW, "nrcan-manifest.json"), JSON.stringify(manifest, null, 2));
}

async function fetchEpa() {
  const zip = path.join(RAW, "epa-vehicles.csv.zip");
  const res = await fetch("https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip");
  if (!res.ok) throw new Error(`EPA download failed: ${res.status}`);
  fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  execFileSync("unzip", ["-o", "-q", zip, "-d", RAW]);
  fs.renameSync(path.join(RAW, "vehicles.csv"), path.join(RAW, "epa-vehicles.csv"));
  console.log("EPA: vehicles.csv downloaded");
}

fs.mkdirSync(RAW, { recursive: true });
await fetchNrcan();
await fetchEpa();
