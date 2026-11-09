// Turns the raw NRCan + EPA downloads (data/raw/) into the clean vehicle list the site uses:
//   src/data/vehicles.json   – one row per vehicle version, 2010 and later
//   docs/data-coverage.md    – counts per year and fuel type, plus every row we could not use
// Run with: npm run data:build   (after npm run data:fetch)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RAW = path.resolve("data/raw");
const FIRST_YEAR = 2010; // team decision 2026-10-28: 2010 and later is enough

// ---------- small helpers ----------
const num = (v) => {
  if (v === undefined || v === null) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/4x4/g, "4wd")
    .replace(/\bffv\b/g, "")
    .replace(/[^a-z0-9]/g, "");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

// NRCan transmission codes, e.g. "AS8" → "Automatic with select shift, 8-speed"
function transmissionLabel(code) {
  const m = /^(AS|AM|AV|A|M)(\d*)$/.exec(code || "");
  if (!m) return code || "";
  const kind = { A: "Automatic", AS: "Automatic (select shift)", AM: "Automated manual", AV: "CVT", M: "Manual" }[m[1]];
  if (m[1] === "AV") return "CVT";
  return m[2] ? `${kind}, ${m[2]}-speed` : kind;
}

// Vehicle class → simple size bucket used for insurance, maintenance, depreciation and price estimates
function classBucket(nrcanClass, epaVClass, engineL) {
  const c = nrcanClass.toLowerCase();
  if (c.startsWith("pickup truck: small")) return "pickup-small";
  if (c.startsWith("pickup truck")) return "pickup-large";
  if (c.includes("minivan") || c.startsWith("van")) return "van";
  if (c.startsWith("sport utility vehicle: small")) return "suv-small";
  if (c.startsWith("sport utility vehicle: standard") || c.startsWith("special purpose")) return "suv-large";
  if (c === "sport utility vehicle") {
    // 2010–2014 NRCan files don't split SUVs by size; use the EPA class, else engine size
    if (epaVClass && /small sport/i.test(epaVClass)) return "suv-small";
    if (epaVClass && /standard sport/i.test(epaVClass)) return "suv-large";
    return engineL && engineL <= 2.5 ? "suv-small" : "suv-large";
  }
  if (c.includes("two-seater")) return "sports";
  if (c.includes("minicompact") || c.includes("subcompact")) return "car-small";
  if (c === "compact" || c.includes("station wagon: small")) return "car-compact";
  if (c.includes("mid-size")) return "car-mid";
  if (c.includes("full-size")) return "car-large";
  return "car-mid";
}

function bodyType(bucket, model) {
  if (bucket.startsWith("pickup")) return "truck";
  if (bucket === "van") return "van";
  if (bucket.startsWith("suv")) return "suv";
  if (/cabrio|convertible|roadster|spyder|spider|volante/i.test(model)) return "convertible";
  if (/coupe|2dr|2-door/i.test(model) || bucket === "sports") return "coupe";
  if (/hatch|5dr|5-door|3-door|3dr/i.test(model)) return "hatchback";
  if (/wagon|estate|touring|avant|sportwagen|allroad/i.test(model)) return "wagon";
  return "sedan";
}

function driveFromName(model, epaDrive) {
  if (/\b(awd|4wd|4x4|4matic\+?|xdrive|quattro|all4|e-four|sh-awd|4motion|e-awd|q4)\b/i.test(model)) return "AWD/4WD";
  if (/\b(2wd|fwd|rwd|4x2|sdrive)\b/i.test(model)) return "2WD";
  if (epaDrive) return /4-wheel|all-wheel|4wd|awd|part-time/i.test(epaDrive) ? "AWD/4WD" : "2WD";
  return "2WD";
}

// ---------- EPA index (for cross-check, hybrid flag, base model name, drive) ----------
const epaRows = parseCsv(fs.readFileSync(path.join(RAW, "epa-vehicles.csv"), "utf8")).filter((r) => +r.year >= FIRST_YEAR);
const epaByKey = new Map();
const epaByYearMake = new Map();
for (const r of epaRows) {
  const k = `${r.year}|${r.make.toLowerCase()}|${norm(r.model)}`;
  if (!epaByKey.has(k)) epaByKey.set(k, []);
  epaByKey.get(k).push(r);
  const ym = `${r.year}|${r.make.toLowerCase()}`;
  if (!epaByYearMake.has(ym)) epaByYearMake.set(ym, []);
  epaByYearMake.get(ym).push(r);
}
const tokens = (s) => new Set(String(s).toLowerCase().replace(/4x4/g, "4wd").split(/[^a-z0-9.]+/).filter(Boolean));

// Returns { row, exact } or null. Exact = same year, make and model name.
function matchEpa(year, make, model, engineL, cyl) {
  const exact = epaByKey.get(`${year}|${make.toLowerCase()}|${norm(model)}`);
  if (exact) {
    const best = exact.find((r) => num(r.displ) === engineL) || exact[0];
    return { row: best, exact: true };
  }
  const pool = epaByYearMake.get(`${year}|${make.toLowerCase()}`) || [];
  const t = tokens(model);
  let best = null, bestScore = 0;
  for (const r of pool) {
    const u = tokens(r.model);
    let inter = 0;
    for (const x of t) if (u.has(x)) inter++;
    let score = inter / (t.size + u.size - inter);
    if (engineL && num(r.displ) === engineL) score += 0.15;
    if (cyl && num(r.cylinders) === cyl) score += 0.05;
    if (score > bestScore) { bestScore = score; best = r; }
  }
  return bestScore >= 0.5 ? { row: best, exact: false } : null;
}

// ---------- base model ("family") names ----------
// Multi-word families the simple rules would split wrongly. Checked longest first.
const FAMILY_PREFIXES = {
  "Land Rover": ["Range Rover Sport", "Range Rover Evoque", "Range Rover Velar", "Range Rover", "Discovery Sport", "Discovery", "Defender", "LR2", "LR4"],
  Lincoln: ["Grand Marquis", "Town Car"],
  FIAT: ["500X", "500L", "500e", "500", "124 Spider"],
  Ram: ["Cargo Van", "ProMaster City", "Promaster City", "ProMaster", "1500", "2500"],
  Dodge: ["Grand Caravan", "Ram 1500", "Journey", "Durango", "Challenger", "Charger", "Dart", "Avenger", "Caliber", "Nitro", "Viper", "Hornet"],
  Chrysler: ["Town & Country", "Grand Caravan", "Pacifica", "200", "300"],
  Jeep: ["Grand Cherokee L", "Grand Cherokee", "Grand Wagoneer", "Wagoneer S", "Wagoneer", "Wrangler Unlimited", "Wrangler", "Cherokee", "Compass", "Patriot", "Renegade", "Gladiator", "Liberty", "Commander", "Recon"],
  Tesla: ["Model S", "Model 3", "Model X", "Model Y", "Cybertruck", "Roadster"],
  Chevrolet: ["City Express", "Silverado 1500", "Silverado LD", "Silverado EV", "Silverado", "Blazer EV", "Equinox EV", "Trax", "Trailblazer", "Bolt EUV", "Bolt EV", "Bolt", "Camaro", "Corvette", "Express", "Colorado", "Tahoe", "Suburban", "Traverse", "Equinox", "Malibu", "Cruze", "Sonic", "Spark", "Volt", "Impala", "Avalanche", "Orlando", "Aveo", "Cobalt", "HHR"],
  GMC: ["Sierra 1500", "Sierra EV", "Sierra", "Hummer EV", "Yukon XL", "Yukon", "Canyon", "Terrain", "Acadia", "Savana", "Envoy"],
  Ford: ["F-150 Lightning", "F-150", "Mustang Mach-E", "Mustang", "Escape", "Explorer", "Expedition", "Edge", "Bronco Sport", "Bronco", "Maverick", "Ranger", "Transit Connect", "Transit", "E-Transit", "Fusion", "Focus", "Fiesta", "Taurus", "Flex", "EcoSport", "C-MAX", "GT", "Crown Victoria"],
  Toyota: ["Grand Highlander", "Highlander", "RAV4 Prime", "RAV4", "Corolla Cross", "Corolla iM", "Corolla", "Camry", "Prius Prime", "Prius c", "Prius v", "Prius", "Tacoma", "Tundra", "Sienna", "Sequoia", "4Runner", "Venza", "Crown Signia", "Crown", "bZ4X", "bZ", "C-HR", "GR86", "GR Supra", "GR Corolla", "Supra", "86", "Yaris", "Avalon", "Mirai", "Land Cruiser", "Matrix", "FJ Cruiser"],
  Honda: ["CR-V", "HR-V", "Civic", "Accord", "Pilot", "Passport", "Odyssey", "Ridgeline", "Fit", "Insight", "Clarity", "Prologue", "CR-Z", "Crosstour", "Element"],
  Hyundai: ["Santa Fe XL", "Santa Fe Sport", "Santa Fe", "Santa Cruz", "IONIQ 5 N", "IONIQ 5", "IONIQ 6", "IONIQ 9", "Ioniq", "Elantra GT", "Elantra", "Sonata", "Tucson", "Kona", "Venue", "Palisade", "Accent", "Veloster", "Genesis Coupe", "Genesis", "Equus", "Azera", "Veracruz", "NEXO"],
  Kia: ["Niro EV", "Niro", "Sorento", "Sportage", "Telluride", "Seltos", "Soul EV", "Soul", "Forte", "Optima", "K5", "K900", "Stinger", "Carnival", "Sedona", "Rio", "Rondo", "EV6", "EV9", "EV3", "Cadenza", "Borrego"],
  Mazda: ["CX-30", "CX-3", "CX-50", "CX-5", "CX-70", "CX-7", "CX-90", "CX-9", "MX-5", "MX-30", "Mazda3", "Mazda5", "Mazda6", "Mazda2"],
  Nissan: ["Rogue Sport", "Rogue", "Altima", "Sentra", "Versa Note", "Versa", "Kicks", "Murano", "Pathfinder", "Armada", "Frontier", "Titan XD", "Titan", "LEAF", "Ariya", "Maxima", "Qashqai", "Juke", "370Z", "Z", "GT-R", "Micra", "Quest", "Cube", "Xterra", "NV200", "NV"],
  Subaru: ["Crosstrek", "XV Crosstrek", "Outback", "Forester", "Impreza", "Legacy", "Ascent", "WRX", "BRZ", "Solterra", "Tribeca"],
  Volkswagen: ["City Golf", "City Jetta", "Atlas Cross Sport", "Atlas", "Golf R", "Golf GTI", "e-Golf", "Golf", "GTI", "Jetta", "Passat", "Tiguan", "Taos", "ID.4", "ID. Buzz", "Arteon", "Beetle", "Touareg", "CC", "Eos", "Routan"],
  "Mercedes-Benz": [],
  BMW: [],
  Audi: [],
};

function familyName(make, rawModel, epaBase) {
  // Marketing prefixes NRCan sometimes puts in front of the model name
  const model = rawModel.replace(/^(New|All-new|Electrified|Black Badge)\s+/i, "");
  if (make === "MINI") {
    for (const f of ["Countryman", "Clubman", "Paceman", "Convertible", "Roadster", "Coupe"]) if (model.includes(f)) return f;
    return "Cooper (Hardtop)";
  }
  if (make === "BMW" && /^alpina/i.test(model)) return "ALPINA";
  if (make === "Ford" && /^shelby/i.test(model)) return "Mustang";
  if (make === "Ford" && /^Transit Connect/i.test(model)) return "Transit Connect";
  if (make === "Ford" && /^(T-1[58]0|Transit)/i.test(model)) return "Transit";
  if (make === "Audi" && /^allroad/i.test(model)) return "A4 allroad";
  const list = FAMILY_PREFIXES[make];
  if (list && list.length) {
    const hit = list.find((p) => model.toLowerCase().startsWith(p.toLowerCase()));
    if (hit) return hit;
  }
  if (make === "BMW") {
    // "M340i" and "M760i" are M Performance versions of the 3 and 7 Series, not the M3 / M7
    const mp = /^M(\d)\d\d[a-z]/i.exec(model);
    if (mp) return `${mp[1]} Series`;
    const m = /^(\d)\d\d[a-z]*/i.exec(model);
    if (m) return `${m[1]} Series`;
    const x = /^(i[X3-8]|X[1-7]M?|Z4|M\d|XM|i\d)/.exec(model);
    if (x) return x[1];
  }
  if (make === "Mercedes-Benz") {
    // "AMG C 43 4MATIC Sedan" → C-Class, "GLE 350" → GLE, "EQS 450+" → EQS
    const s = model.replace(/^(Mercedes-)?AMG\s+/i, "").replace(/^Maybach\s+/i, "");
    const m = /^(EQ[A-Z]|GL[A-Z]?|SL[A-Z]?|CL[A-Z]?|ML|G|C|E|S|A|B|R|M)\s?\d/.exec(s);
    if (m) {
      const k = m[1];
      if (k === "ML") return "M-Class";
      if (["C", "E", "S", "A", "B", "G", "R", "M", "CL", "SL"].includes(k)) return `${k}-Class`;
      return k;
    }
    if (/^(AMG GT|GT)/i.test(s)) return "AMG GT";
    if (/^Sprinter/i.test(s)) return "Sprinter";
    if (/^Metris/i.test(s)) return "Metris";
  }
  if (make === "Audi") {
    const m = /^(e-tron GT|Q\d e-tron|Q\d|A\d|S\d|RS ?\d|TT|R8|SQ\d|e-tron)/i.exec(model);
    if (m) return m[1];
  }
  if (make === "Lexus" || make === "Infiniti" || make === "Acura" || make === "Genesis" || make === "Lincoln" || make === "Cadillac" || make === "Volvo" || make === "Porsche") {
    // Usually the first word is the family: "RX 350" → RX, "MDX SH-AWD" → MDX, "XC90 T6" → XC90
    const first = model.split(/\s+/)[0].replace(/\d{3}h?$/, "");
    if (make === "Lexus") return model.split(/\s+/)[0];
    if (first) return model.split(/\s+/)[0];
  }
  if (epaBase && model.toLowerCase().startsWith(epaBase.toLowerCase())) return epaBase;
  // Fallback: first word, or first two words when the first is very short (e.g. "Model 3")
  const parts = model.split(/\s+/);
  return parts[0].length <= 2 && parts[1] ? `${parts[0]} ${parts[1]}` : parts[0];
}

// Full hybrids that don't say "Hybrid" in their NRCan name
const HYBRID_NAME = /hybrid|\bprius\b|\binsight\b|\b\d{3}h\b|\bhev\b|\bioniq\b(?! ?\d)|\bniro\b(?! ?ev)|\bcr-z\b|\bclarity\b/i;
const MILD = /\bmhev\b|mild|eassist/i;
// Model years in which a family was sold only as a full hybrid in Canada, so every gas row is really a hybrid
const HYBRID_ONLY = [
  ["Toyota", "RAV4", 2026], ["Toyota", "Camry", 2025], ["Toyota", "Sienna", 2021], ["Toyota", "Venza", 2021],
  ["Toyota", "Crown", 2023], ["Toyota", "Crown Signia", 2025], ["Toyota", "Sequoia", 2023], ["Toyota", "Land Cruiser", 2024],
];

// ---------- build ----------
const manifest = JSON.parse(fs.readFileSync(path.join(RAW, "nrcan-manifest.json"), "utf8"));
const out = [];
const rejected = [];
const seen = new Set();
const epaStats = { exact: 0, close: 0, none: 0 };
const epaFixes = [];

for (const file of manifest.files) {
  const rows = JSON.parse(fs.readFileSync(path.join(RAW, file.file), "utf8"));
  const kind = /battery-electric/i.test(file.name) ? "ev" : /plug-in/i.test(file.name) ? "phev" : "conv";
  for (const r of rows) {
    const year = +r["Model year"];
    if (!(year >= FIRST_YEAR)) continue;
    const make = String(r.Make).trim();
    const model = String(r.Model).trim();
    const reject = (reason) => rejected.push({ year, make, model, file: file.name, reason });

    const v = {
      year, make, model,
      nrcanClass: String(r["Vehicle class"]).trim(),
      transmission: String(r.Transmission || "").trim(),
      engineL: num(r["Engine size (L)"]),
      cylinders: num(r.Cylinders),
      motorKw: num(r["Motor (kW)"]),
    };

    if (kind === "conv") {
      const f = String(r["Fuel type"]).trim();
      if (f === "E") { reject("E85 rating of a flex-fuel vehicle (its gasoline rating is kept)"); continue; }
      if (f === "N") { reject("Natural gas vehicle (not sold to the public in Alberta)"); continue; }
      v.fuelGrade = f === "Z" ? "premium" : f === "D" ? "diesel" : "regular";
      v.cityL = num(r["City (L/100 km)"]);
      v.hwyL = num(r["Highway (L/100 km)"]);
      v.combL = num(r["Combined (L/100 km)"]);
      if (!v.cityL || !v.hwyL) { reject("Missing city/highway fuel consumption"); continue; }
      v.fuelType = f === "D" ? "diesel" : "gas";
    } else if (kind === "ev") {
      v.fuelType = "ev";
      v.fuelGrade = "electricity";
      v.cityKwh = num(r["City (kWh/100 km)"]);
      v.hwyKwh = num(r["Highway (kWh/100 km)"]);
      v.combKwh = num(r["Combined (kWh/100 km)"]);
      v.cityLe = num(r["City (Le/100 km)"]);
      v.hwyLe = num(r["Highway (Le/100 km)"]);
      v.combLe = num(r["Combined (Le/100 km)"]);
      v.rangeKm = num(r["Range (km)"]);
      if (!v.cityKwh || !v.hwyKwh) { reject("Missing kWh/100 km"); continue; }
    } else {
      v.fuelType = "phev";
      const g = String(r["Fuel type 2"]).trim();
      v.fuelGrade = g === "Z" ? "premium" : "regular";
      // e.g. "2.5 (22.3 kWh/100 km)" or "2.4 ([20.0 kWh + 0.2 L]/100 km)"
      const le = String(r["Combined Le/100 km"] || "");
      const kwh = /([\d.]+)\s*kWh/i.exec(le);
      const cdGas = /\+\s*([\d.]+)\s*L/i.exec(le);
      v.cdL = cdGas ? num(cdGas[1]) : 0; // gasoline still used per 100 km while running on the battery
      v.combLe = num(le.split("(")[0]);
      v.combKwh = kwh ? num(kwh[1]) : null;
      v.cityKwh = v.combKwh; // NRCan gives only a combined electric rating for PHEVs
      v.hwyKwh = v.combKwh;
      v.electricRangeKm = num(r["Range 1 (km)"]);
      v.cityL = num(r["City (L/100 km)"]);
      v.hwyL = num(r["Highway (L/100 km)"]);
      v.combL = num(r["Combined (L/100 km)"]);
      v.rangeKm = num(r["Range 2 (km)"]);
      if (!v.combKwh || !v.cityL || !v.hwyL || !v.electricRangeKm) { reject("Missing PHEV electric or gas rating"); continue; }
    }

    const m = matchEpa(year, make, model, v.engineL, v.cylinders);
    if (!m) epaStats.none++; else if (m.exact) epaStats.exact++; else epaStats.close++;
    const epa = m?.row;

    if (v.fuelType === "gas") {
      const nameSaysHybrid = HYBRID_NAME.test(model) && !MILD.test(model);
      const epaSaysHybrid = m?.exact && epa.atvType === "Hybrid" && !MILD.test(epa.model) && !MILD.test(epa.eng_dscr || "");
      if (nameSaysHybrid || epaSaysHybrid) v.fuelType = "hybrid";
      if (epaSaysHybrid && !nameSaysHybrid) epaFixes.push(`${year} ${make} ${model}: marked as hybrid (EPA lists it as a hybrid; NRCan name doesn't say so)`);
    }

    if (v.fuelType === "gas" && HYBRID_ONLY.some(([mk, fam, from]) => mk === make && familyName(make, model, epa?.baseModel) === fam && year >= from)) {
      v.fuelType = "hybrid";
    }
    v.classBucket = classBucket(v.nrcanClass, epa?.VClass, v.engineL);
    v.body = bodyType(v.classBucket, model);
    v.drive = driveFromName(model, epa?.drive);
    v.family = familyName(make, model, epa?.baseModel);
    v.epaCheck = m ? (m.exact ? "exact" : "close") : "none";

    const engine =
      v.fuelType === "ev"
        ? `Electric${v.motorKw ? `, ${v.motorKw} kW` : ""}`
        : `${v.engineL ?? "?"} L ${v.cylinders ?? "?"}-cyl${v.fuelType === "phev" ? " plug-in hybrid" : v.fuelType === "hybrid" ? " hybrid" : v.fuelType === "diesel" ? " diesel" : ""}`;
    // The combined rating tells apart versions NRCan lists with the same name, engine and transmission
    const rating = v.fuelType === "ev" ? `${v.combKwh} kWh/100 km` : v.fuelType === "phev" ? `${v.electricRangeKm} km electric` : `${v.combL} L/100 km`;
    v.version = `${model} · ${engine} · ${transmissionLabel(v.transmission)} · ${rating}`;

    const key = [year, make, model, v.engineL, v.cylinders, v.transmission, v.fuelType, v.fuelGrade, v.cityL ?? v.cityKwh, v.hwyL ?? v.hwyKwh].join("|");
    if (seen.has(key)) { reject("Exact duplicate of another row"); continue; }
    seen.add(key);
    // Stable ID from the identifying fields, so saved comparisons and share links survive a data refresh
    v.id = crypto.createHash("sha1").update(key).digest("base64url").slice(0, 10);
    out.push(v);
  }
}

// ---------- fill gaps from the US EPA list ----------
// NRCan rates vehicles through the model year, and has not published any 2027 ratings yet. Where the EPA rated a
// model in a year that NRCan has no row for (same make and model family), we add the EPA rating, marked as such.
// To avoid US-only models, a family must also appear in NRCan in some year, except brand-new 2026–2027 nameplates.
const LAST_EPA_YEAR = 2027;
const nrcanMakes = new Map([...new Set(out.map((v) => v.make))].map((m) => [m.toLowerCase(), m]));
const nrcanFamilies = new Map(); // make -> Set of normalized family names (any year)
const nrcanFamilyYear = new Set(); // make|normFamily|year
const famNameByNorm = new Map(); // make|normFamily -> family name as shown
for (const v of out) {
  const nf = norm(v.family);
  if (!nrcanFamilies.has(v.make)) nrcanFamilies.set(v.make, new Set());
  nrcanFamilies.get(v.make).add(nf);
  nrcanFamilyYear.add(`${v.make}|${nf}|${v.year}`);
  famNameByNorm.set(`${v.make}|${nf}`, v.family);
}
function epaTransmission(t) {
  // "Automatic (S8)" → AS8, "Automatic (AM-S7)" → AM7, "Automatic (AV-S6)" / "(variable gear ratios)" → AV, "Manual 6-spd" → M6
  if (/variable|AV/i.test(t)) return "AV";
  let m = /\(AM-?S?(\d+)\)/i.exec(t);
  if (m) return `AM${m[1]}`;
  m = /\(S(\d+)\)/i.exec(t);
  if (m) return `AS${m[1]}`;
  m = /\(A(\d+)\)/i.exec(t);
  if (m) return `A${m[1]}`;
  m = /Manual\s*(\d+)/i.exec(t);
  if (m) return `M${m[1]}`;
  return /manual/i.test(t) ? "M" : "A";
}
function epaClass(vc) {
  const c = vc.toLowerCase();
  if (c.includes("small pickup")) return ["Pickup truck: Small", "pickup-small"];
  if (c.includes("pickup")) return ["Pickup truck: Standard", "pickup-large"];
  if (c.includes("minivan")) return ["Minivan", "van"];
  if (c.includes("van")) return ["Van: Passenger", "van"];
  if (c.includes("small sport utility")) return ["Sport utility vehicle: Small", "suv-small"];
  if (c.includes("sport utility") || c.includes("special purpose")) return ["Sport utility vehicle: Standard", "suv-large"];
  if (c.includes("two seater")) return ["Two-seater", "sports"];
  if (c.includes("minicompact") || c.includes("subcompact")) return ["Subcompact", "car-small"];
  if (c.includes("compact") || c.includes("small station")) return ["Compact", "car-compact"];
  if (c.includes("midsize")) return ["Mid-size", "car-mid"];
  if (c.includes("large")) return ["Full-size", "car-large"];
  return ["Mid-size", "car-mid"];
}
// EPA spells some makes differently; McLaren and Saab were sold in Canada but are not in NRCan's tables
const EPA_MAKE_ALIAS = { "McLaren Automotive": "McLaren", "INEOS Automotive": "INEOS", "Bugatti Rimac": "Bugatti", Saab: "Saab" };
const CANADA_MAKES_NOT_IN_NRCAN = new Set(["McLaren", "Saab"]);
// EPA model names that are sold under another name in Canada, or that our rules would group wrongly
function epaFamilyFix(make, model) {
  if (make === "Mazda" && /^\d\b/.test(model)) return `Mazda${model[0]}`;
  if (make === "Volkswagen" && /^GLI/i.test(model)) return "Jetta";
  if (make === "Volkswagen" && /^GTI/i.test(model)) return "Golf GTI";
  if (make === "Mitsubishi" && /^Outlander Sport/i.test(model)) return "RVR";
  if (make === "Mitsubishi" && /^Eclipse Sportback/i.test(model)) return "Eclipse Sportback";
  if (make === "Chevrolet" && /^Bolt/i.test(model)) return "Bolt EV";
  if (make === "Toyota" && /^GR 86/i.test(model)) return "GR86";
  if (make === "McLaren") return model.replace(/\s+(Spider|Coupe|Spyder)$/i, "").trim();
  if (make === "Saab") return model.split(/\s+/)[0];
  return null;
}
const L100 = (mpg) => (mpg > 0 ? Math.round((235.215 / mpg) * 10) / 10 : null);
const KWH_KM = (kwh100mi) => (kwh100mi > 0 ? Math.round((kwh100mi / 1.609344) * 10) / 10 : null);
const epaAdded = [];
const epaSkipped = { usOnly: 0, otherFuel: 0, unknownMake: 0 };
const epaAll = parseCsv(fs.readFileSync(path.join(RAW, "epa-vehicles.csv"), "utf8")).filter((r) => +r.year >= FIRST_YEAR && +r.year <= LAST_EPA_YEAR);
for (const r of epaAll) {
  const year = +r.year;
  const make = EPA_MAKE_ALIAS[r.make] ?? nrcanMakes.get(r.make.toLowerCase()) ?? nrcanMakes.get(r.make.toLowerCase().replace(/ usa$/, ""));
  if (!make) { epaSkipped.unknownMake++; continue; }
  const model = r.model.trim();
  const fixedFamily = epaFamilyFix(make, model);
  // Family: an NRCan family whose name starts this EPA model name (longest wins), else our naming rules
  const nm = norm(model);
  const known = [...(nrcanFamilies.get(make) ?? [])].filter((f) => nm.startsWith(f)).sort((a, b) => b.length - a.length)[0];
  const family = fixedFamily ?? (known ? famNameByNorm.get(`${make}|${known}`) : familyName(make, model, r.baseModel));
  const nf = norm(family);
  if (nrcanFamilyYear.has(`${make}|${nf}|${year}`)) continue; // NRCan already covers this model this year
  const canadianMakeMissingFromNrcan = CANADA_MAKES_NOT_IN_NRCAN.has(make);
  const isNewNameplate = !canadianMakeMissingFromNrcan && !nrcanFamilies.get(make)?.has(nf);
  if (isNewNameplate && year < 2026) { epaSkipped.usOnly++; continue; }

  const atv = r.atvType;
  if (/CNG|FCV|Bifuel/i.test(atv) || /hydrogen|natural gas/i.test(r.fuelType)) { epaSkipped.otherFuel++; continue; }
  const [nrcanClass, bucket] = epaClass(r.VClass);
  const v = {
    year, make, model, nrcanClass,
    transmission: epaTransmission(r.trany),
    engineL: num(r.displ) || null,
    cylinders: num(r.cylinders) || null,
    motorKw: num((/(\d+)\s*kW/i.exec(r.evMotor ?? "") ?? [])[1]),
    ratingSource: "EPA",
  };
  if (atv === "EV") {
    Object.assign(v, { fuelType: "ev", fuelGrade: "electricity", cityKwh: KWH_KM(num(r.cityE)), hwyKwh: KWH_KM(num(r.highwayE)), combKwh: KWH_KM(num(r.combE)), rangeKm: Math.round((num(r.range) ?? 0) * 1.609344) || null, engineL: null, cylinders: null });
    if (!v.cityKwh || !v.hwyKwh) continue;
  } else if (atv === "Plug-in Hybrid") {
    const grade = /premium/i.test(r.fuelType1) ? "premium" : "regular";
    const kwh = KWH_KM(num(r.combE));
    Object.assign(v, { fuelType: "phev", fuelGrade: grade, cityL: L100(num(r.city08)), hwyL: L100(num(r.highway08)), combL: L100(num(r.comb08)), cityKwh: kwh, hwyKwh: kwh, combKwh: kwh, cdL: 0, electricRangeKm: Math.round((num(r.rangeA) ?? 0) * 1.609344) || null, rangeKm: Math.round((num(r.range) ?? 0) * 1.609344) || null });
    if (!v.cityL || !v.combKwh || !v.electricRangeKm) continue;
  } else {
    const diesel = /diesel/i.test(r.fuelType1);
    const hybrid = atv === "Hybrid" && !MILD.test(model) && !MILD.test(r.eng_dscr ?? "");
    Object.assign(v, { fuelType: diesel ? "diesel" : hybrid ? "hybrid" : "gas", fuelGrade: diesel ? "diesel" : /premium|midgrade/i.test(r.fuelType1) ? "premium" : "regular", cityL: L100(num(r.city08)), hwyL: L100(num(r.highway08)), combL: L100(num(r.comb08)) });
    if (!v.cityL || !v.hwyL) continue;
    if (v.fuelType === "gas" && HYBRID_ONLY.some(([mk, fam, from]) => mk === make && fam === family && year >= from)) v.fuelType = "hybrid";
  }
  v.classBucket = bucket;
  v.body = bodyType(bucket, model);
  v.drive = /4-wheel|all-wheel|4wd|awd|part-time/i.test(r.drive) ? "AWD/4WD" : "2WD";
  v.family = family;
  v.epaCheck = "exact";
  if (isNewNameplate) v.availabilityNote = "New for this model year; rated by the US EPA. Check that it is sold in Canada.";
  const engine = v.fuelType === "ev" ? `Electric${v.motorKw ? `, ${v.motorKw} kW` : ""}` : `${v.engineL ?? "?"} L ${v.cylinders ?? "?"}-cyl${v.fuelType === "phev" ? " plug-in hybrid" : v.fuelType === "hybrid" ? " hybrid" : v.fuelType === "diesel" ? " diesel" : ""}`;
  const rating = v.fuelType === "ev" ? `${v.combKwh} kWh/100 km` : v.fuelType === "phev" ? `${v.electricRangeKm} km electric` : `${v.combL} L/100 km`;
  v.version = `${model} · ${engine} · ${transmissionLabel(v.transmission)} · ${rating} (US EPA)`;
  const key = ["epa", year, make, model, v.engineL, v.cylinders, v.transmission, v.fuelType, v.cityL ?? v.cityKwh, v.hwyL ?? v.hwyKwh, r.drive].join("|");
  if (seen.has(key)) continue;
  seen.add(key);
  v.id = crypto.createHash("sha1").update(key).digest("base64url").slice(0, 10);
  out.push(v);
  epaAdded.push(v);
}
console.log(`EPA gap fill: added ${epaAdded.length}; skipped`, epaSkipped);

out.sort((a, b) => b.year - a.year || a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || (a.engineL ?? 0) - (b.engineL ?? 0));

fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/vehicles.json", JSON.stringify(out));

// ---------- coverage report ----------
const types = ["gas", "hybrid", "phev", "ev", "diesel"];
const byYear = {};
for (const v of out) {
  byYear[v.year] ??= Object.fromEntries(types.map((t) => [t, 0]));
  byYear[v.year][v.fuelType]++;
}
const today = new Date().toISOString().slice(0, 10);
let md = `# Vehicle data coverage\n\nGenerated ${today} by \`npm run data:build\`. Source: NRCan Fuel Consumption Ratings (${manifest.datasetUrl}), downloaded ${manifest.fetchedAt.slice(0, 10)}, cross-checked with US EPA fueleconomy.gov.\n\n`;
md += `**${out.length.toLocaleString("en-CA")} vehicle versions** from model year ${FIRST_YEAR} to ${Math.max(...out.map((v) => v.year))}, ${new Set(out.map((v) => v.make)).size} makes, ${new Set(out.map((v) => v.make + "|" + v.family)).size} model families.\n\n`;
md += `## Source files\n\n| NRCan file | Rows (all years) | Last updated by NRCan |\n|---|---:|---|\n`;
for (const f of manifest.files) md += `| ${f.name} | ${f.rows.toLocaleString("en-CA")} | ${String(f.lastModified).slice(0, 10)} |\n`;
md += `\n## Vehicles per model year and fuel type\n\n| Year | Gas | Hybrid | Plug-in hybrid | Electric | Diesel | Total |\n|---|---:|---:|---:|---:|---:|---:|\n`;
for (const y of Object.keys(byYear).sort().reverse()) {
  const c = byYear[y];
  md += `| ${y} | ${types.map((t) => c[t]).join(" | ")} | ${types.reduce((s, t) => s + c[t], 0)} |\n`;
}
md += `\n## Cross-check against US EPA (fueleconomy.gov)\n\n- Same name found in EPA data: ${epaStats.exact.toLocaleString("en-CA")}\n- Close match (similar name, same engine): ${epaStats.close.toLocaleString("en-CA")}\n- No EPA match (often Canada-only names or trims): ${epaStats.none.toLocaleString("en-CA")}\n\nEPA data was used only to (a) flag full hybrids whose NRCan name doesn't say "hybrid", (b) tell small from large SUVs in 2010–2014, where NRCan doesn't split them, and (c) fill the drive type when the name doesn't show it. Consumption numbers are NRCan's, except for the vehicles listed under "Added from the EPA list" below.\n\n### Cars changed using EPA data (${epaFixes.length})\n\n`;
md += epaFixes.length ? epaFixes.map((s) => `- ${s}`).join("\n") + "\n" : "None.\n";
md += `\n## Added from the EPA list (${epaAdded.length} versions)\n\nNRCan rates vehicles through the model year and had not published any 2027 ratings when this ran. Where the US EPA rated a model in a year NRCan has no row for, we added the EPA rating (converted to L/100 km or kWh/100 km), marked "US EPA" on the site. Families must also appear in NRCan in some year (so US-only models are left out), except brand-new 2026–2027 nameplates, which carry a note asking users to check Canadian availability. Skipped: ${epaSkipped.usOnly} rows of US-only models, ${epaSkipped.otherFuel} hydrogen or natural-gas rows, ${epaSkipped.unknownMake} rows from makes not sold in Canada.\n\n`;
const addedFam = {};
for (const v of epaAdded) (addedFam[v.year] ??= new Set()).add(`${v.make} ${v.family}${v.availabilityNote ? " (new nameplate)" : ""}`);
for (const y of Object.keys(addedFam).sort().reverse()) md += `- **${y}:** ${[...addedFam[y]].sort().join(", ")}\n`;
const byReason = {};
for (const r of rejected) (byReason[r.reason] ??= []).push(r);
md += `\n## Rows we did not use (${rejected.length})\n\n`;
for (const [reason, list] of Object.entries(byReason)) {
  md += `### ${reason} (${list.length})\n\n<details><summary>Show list</summary>\n\n`;
  md += list.map((r) => `- ${r.year} ${r.make} ${r.model}`).join("\n") + "\n\n</details>\n\n";
}
fs.writeFileSync("docs/data-coverage.md", md);
console.log(`Wrote ${out.length} vehicles; rejected ${rejected.length}. EPA match:`, epaStats);
