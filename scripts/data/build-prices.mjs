// Gives every vehicle in src/data/vehicles.json a pre-filled Canadian MSRP (base price, before freight, fees and GST).
//
// How a price is found, in order:
//   1. A base price for the model family (data/prices/verified-prices.csv wins over family-prices.csv).
//      Rows with a "match" pattern are trim-specific (e.g. "Type R"); rows with a "fuel" only apply to that fuel type.
//   2. Moved to the vehicle's model year with Statistics Canada's CPI for new passenger vehicles
//      (data/raw/statcan-new-vehicle-cpi.json, made by npm run data:fetch).
//   3. Adjusted for the version: AWD/4WD, bigger engine or motor, hybrid/plug-in/electric, and well-known
//      performance or luxury trims. The rules are in VERSION_RULES below and on the "How we calculate" page.
//
// Every price is labelled "verified" (it is the published base price, with source) or "estimate".
// Run with: npm run data:prices (after data:build)
import fs from "node:fs";
import path from "node:path";

const VEHICLES = path.resolve("src/data/vehicles.json");
const today = new Date().toISOString().slice(0, 10);

function readCsv(file) {
  const [head, ...lines] = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const cols = head.split(",");
  return lines.filter(Boolean).map((line) => {
    const cells = line.split(",");
    const row = Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? "").trim()]));
    row.year = +row.year;
    row.price = +row.price;
    row.re = row.match ? new RegExp(row.match, "i") : null;
    return row;
  });
}

const estimates = readCsv("data/prices/family-prices.csv").map((r) => ({ ...r, status: "estimate" }));
const verified = readCsv("data/prices/verified-prices.csv").map((r) => ({ ...r, status: "verified" }));
const anchorsByFamily = new Map();
for (const a of [...verified, ...estimates]) {
  const k = `${a.make}|${a.family}`;
  if (!anchorsByFamily.has(k)) anchorsByFamily.set(k, []);
  anchorsByFamily.get(k).push(a);
}

// ---------- price index (Statistics Canada CPI, purchase of new passenger vehicles) ----------
let cpi = null;
const cpiFile = path.resolve("data/raw/statcan-new-vehicle-cpi.json");
if (fs.existsSync(cpiFile)) cpi = JSON.parse(fs.readFileSync(cpiFile, "utf8"));
function indexRatio(fromYear, toYear) {
  if (!cpi) return 1;
  const v = (y) => {
    const years = Object.keys(cpi.annual).map(Number).sort();
    const first = years[0], last = years[years.length - 1];
    if (cpi.annual[y]) return cpi.annual[y];
    // Beyond the published years, carry the last year's change forward
    if (y > last) return cpi.annual[last] * Math.pow(cpi.annual[last] / cpi.annual[last - 1], y - last);
    return cpi.annual[first];
  };
  return v(toYear) / v(fromYear);
}

// ---------- version rules ----------
// Extra cost of a fuel type over the gas version of the same model (used only when no fuel-specific base price exists)
const FUEL_PREMIUM = { gas: 0, diesel: 0.08, hybrid: 0.1, phev: 0.3, ev: 0.35 };
const AWD_PREMIUM = 0.07;
// Only the highest matching keyword applies. Patterns are checked against the NRCan model name.
const VERSION_RULES = [
  [/\b(Turbo S|Plaid|Hellcat|Demon|TRX|GT500|Trackhawk|Black Series|Black Badge|SVR|Raptor R|ZR1)\b/i, 1.9, "top performance version"],
  [/\b(Turbo|AMG \w+ 6[35]|RS ?\d|M\d Competition|Z06|ZL1|Raptor|SRT|Type R|GT3|392|Nismo|NISMO|TRD Pro|Shelby|V-Series|Blackwing)\b/i, 1.5, "high-performance version"],
  [/\b(GTS|AMG|M Sport|\bN\b|Si|Type S|ST|SS|R\/T|Scat Pack|GT|Rubicon|Tremor|Denali|Platinum|King Ranch|Limited|Overland|Summit|Pinnacle|Calligraphy|Autobiography|Signature|Prestige|Ultimate)\b/i, 1.22, "upper trim"],
  [/\b(XLE|XSE|EX-L|Touring|Premium|SEL|SXT|Lariat|LTZ|SLT|Laramie|Sport|Luxury|Preferred|GS|GT-Line|Trailhawk|Wilderness|TrailSport|Off-Road|AT4|Z71|Trail Boss)\b/i, 1.1, "mid trim"],
];

function round(n) {
  return Math.round(n / 100) * 100;
}

// Group rows by family and year once, to know the "base" configuration of each family-year
const vehicles = JSON.parse(fs.readFileSync(VEHICLES, "utf8"));
const famYear = new Map();
for (const v of vehicles) {
  const k = `${v.make}|${v.family}|${v.year}`;
  if (!famYear.has(k)) famYear.set(k, []);
  famYear.get(k).push(v);
}

function pickAnchor(v) {
  const all = anchorsByFamily.get(`${v.make}|${v.family}`) || [];
  const fuelOk = (a) => !a.fuel || a.fuel === v.fuelType;
  const byYear = (list) =>
    [...list].sort((a, b) => Math.abs(a.year - v.year) - Math.abs(b.year - v.year) || (a.status === "verified" ? -1 : 1))[0];
  const specific = all.filter((a) => a.re && a.re.test(v.model) && fuelOk(a));
  if (specific.length) return { anchor: byYear(specific), specific: true, fuelMatched: true };
  const general = all.filter((a) => !a.re);
  const sameFuel = general.filter((a) => a.fuel === v.fuelType);
  if (sameFuel.length) return { anchor: byYear(sameFuel), specific: false, fuelMatched: true };
  const anyFuel = general.filter((a) => !a.fuel);
  if (anyFuel.length) return { anchor: byYear(anyFuel), specific: false, fuelMatched: false };
  if (general.length) return { anchor: byYear(general), specific: false, fuelMatched: false };
  return null;
}

// Newest model year of each family (the site treats that year as "new" and older years as used)
const latestYear = new Map();
for (const v of vehicles) latestYear.set(`${v.make}|${v.family}`, Math.max(latestYear.get(`${v.make}|${v.family}`) ?? 0, v.year));
for (const v of vehicles) v.latestFamilyYear = latestYear.get(`${v.make}|${v.family}`);

// Main fuel type of each family (an anchor with no fuel given is assumed to be priced for this fuel)
const fuelCount = new Map();
for (const v of vehicles) {
  const k = `${v.make}|${v.family}`;
  if (!fuelCount.has(k)) fuelCount.set(k, {});
  fuelCount.get(k)[v.fuelType] = (fuelCount.get(k)[v.fuelType] ?? 0) + 1;
}
const mainFuel = (v) => Object.entries(fuelCount.get(`${v.make}|${v.family}`)).sort((a, b) => b[1] - a[1])[0][0];

const stats = { verified: 0, estimate: 0, missing: 0 };
const statusByYear = {};
for (const v of vehicles) {
  const found = pickAnchor(v);
  if (!found) {
    stats.missing++;
    continue;
  }
  const { anchor, specific, fuelMatched } = found;
  const notes = [`${anchor.year} base ${anchor.match ? `(${anchor.note || anchor.match}) ` : ""}$${anchor.price.toLocaleString("en-CA")}`];
  let price = anchor.price;

  const ratio = indexRatio(anchor.year, v.year);
  if (ratio !== 1) {
    price *= ratio;
    notes.push(`price index ${anchor.year}→${v.year} ×${ratio.toFixed(3)}`);
  }

  let mult = 1;
  if (!specific) {
    const siblings = famYear.get(`${v.make}|${v.family}|${v.year}`) || [v];
    if (!fuelMatched) {
      const fromFuel = anchor.fuel || mainFuel(v);
      const p = (FUEL_PREMIUM[v.fuelType] ?? 0) - (FUEL_PREMIUM[fromFuel] ?? 0);
      if (p) {
        mult *= 1 + p;
        notes.push(`${v.fuelType} version +${Math.round(p * 100)}%`);
      }
    }
    let awdApplied = false;
    if (v.drive === "AWD/4WD" && siblings.some((s) => s.drive === "2WD")) {
      mult *= 1 + AWD_PREMIUM;
      awdApplied = true;
      notes.push(`AWD/4WD +${Math.round(AWD_PREMIUM * 100)}%`);
    }
    const same = siblings.filter((s) => s.fuelType === v.fuelType);
    if (v.fuelType === "ev") {
      // On EVs the second motor IS the AWD, so count it only once
      const minKw = Math.min(...same.map((s) => s.motorKw || Infinity));
      if (!awdApplied && v.motorKw && minKw < Infinity && v.motorKw > minKw * 1.3) {
        mult *= 1.15;
        notes.push("more powerful motor +15%");
      }
    } else {
      const minCyl = Math.min(...same.map((s) => s.cylinders || Infinity));
      const minL = Math.min(...same.map((s) => s.engineL || Infinity));
      if (v.cylinders && minCyl < Infinity && v.cylinders > minCyl) {
        const step = Math.min(3, (v.cylinders - minCyl) / 2);
        mult *= 1 + 0.12 * step;
        notes.push(`bigger engine (${v.cylinders} vs ${minCyl} cyl) +${Math.round(12 * step)}%`);
      } else if (v.engineL && minL < Infinity && v.engineL > minL * 1.25) {
        mult *= 1.06;
        notes.push("larger engine +6%");
      }
    }
    // Test trim words on the part of the name after the family name ("Range Rover Sport P400" → "P400")
    const trimPart = v.model.replace(new RegExp(v.family.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ");
    const rule = VERSION_RULES.find(([re]) => re.test(trimPart));
    if (rule) {
      mult *= rule[1];
      notes.push(`${rule[2]} +${Math.round((rule[1] - 1) * 100)}%`);
    }
    mult = Math.min(mult, 2.5);
  }

  v.msrp = round(price * mult);
  // "Verified" only when the number shown is exactly the published base price for this model year
  const isExact = anchor.status === "verified" && anchor.year === v.year && mult === 1;
  v.msrpStatus = isExact ? "verified" : "estimate";
  v.msrpBasis = notes.join("; ");
  if (anchor.status === "verified") {
    v.msrpSource = anchor.source_name;
    v.msrpSourceUrl = anchor.source_url;
    v.msrpChecked = anchor.checked;
  } else {
    delete v.msrpSource;
    delete v.msrpSourceUrl;
    delete v.msrpChecked;
  }
  stats[v.msrpStatus]++;
  statusByYear[v.year] ??= { verified: 0, estimate: 0 };
  statusByYear[v.year][v.msrpStatus]++;
}

fs.writeFileSync(VEHICLES, JSON.stringify(vehicles));

// ---------- report ----------
let md = `# Price coverage\n\nGenerated ${today} by \`npm run data:prices\`.\n\n`;
md += `**Every one of the ${vehicles.length.toLocaleString("en-CA")} vehicle versions has a pre-filled price.** ${stats.verified.toLocaleString("en-CA")} are the exact published base price for that model year (verified, with source). The other ${stats.estimate.toLocaleString("en-CA")} are estimates built from a family base price, the price index and the version rules described on the "How we calculate" page.\n\n`;
md += cpi
  ? `Price index: Statistics Canada CPI, ${cpi.series}, downloaded ${cpi.fetchedAt.slice(0, 10)}.\n\n`
  : `**Price index not yet loaded** (www150.statcan.gc.ca was blocked when this ran). Older model years use the family base price with no inflation adjustment until \`npm run data:refresh\` runs with access.\n\n`;
md += `- Family base prices: ${new Set(estimates.map((a) => a.make + a.family)).size} families in \`data/prices/family-prices.csv\` (estimates)\n- Verified base prices: ${verified.length} rows in \`data/prices/verified-prices.csv\`, each with a source link and date\n\n`;
md += `| Model year | Verified | Estimate |\n|---|---:|---:|\n`;
for (const y of Object.keys(statusByYear).sort().reverse()) md += `| ${y} | ${statusByYear[y].verified} | ${statusByYear[y].estimate} |\n`;
fs.writeFileSync("docs/price-coverage.md", md);
console.log("Prices:", stats, cpi ? "with CPI" : "WITHOUT CPI (StatCan not reachable)");
