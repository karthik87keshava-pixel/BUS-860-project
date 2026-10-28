import type { Metadata } from "next";
import {
  CLASS_FACTORS,
  MAINTENANCE_PER_KM,
  MAINTENANCE_SOURCE,
  SOURCES,
  calculateColumn,
  defaultShared,
  loanPayment,
  type ColumnInputs,
  type SharedInputs,
  type Sourced,
  type VehicleFacts,
} from "@/lib/calc";
import { money, money2, pct } from "@/lib/format";
import { DATA_DATES } from "@/lib/site";
import { DATA_INFO } from "@/lib/vehicles-server";

export const metadata: Metadata = {
  title: "How we calculate",
  description: "Every formula, default value and data source behind DriveTally's Alberta car cost comparison.",
};

// The worked example: the same numbers as "Example 3" in src/lib/calc/calc.test.ts
const exShared: SharedInputs = {
  ...defaultShared(2026),
  kmMode: "yearly",
  kmPerYear: 20000,
  cityShare: 0.5,
  winterMonths: 0,
  fuelIncrease: 0,
  insuranceIncrease: 0,
  gasRegular: 1.5,
  includeCashPrice: true,
};
const exCar: VehicleFacts = {
  id: "example",
  year: 2026,
  make: "Example",
  model: "Gas Sedan",
  family: "Gas Sedan",
  fuelType: "gas",
  fuelGrade: "regular",
  classBucket: "car-mid",
  cityL: 10,
  hwyL: 6,
  msrp: 30000,
};
const exCol: ColumnInputs = {
  payment: "loan",
  condition: "new",
  price: 30000,
  freightPdi: 2000,
  docFee: 500,
  levies: 100,
  luxuryTax: 0,
  rebate: 0,
  downPayment: 5000,
  tradeIn: 0,
  apr: 0.06,
  loanTermMonths: 60,
  leaseRate: 0.05,
  leaseTermMonths: 60,
  residualPct: 0.4,
  kmAllowancePerYear: 20000,
  excessKmRate: 0.12,
  acquisitionFee: 650,
  dispositionFee: 400,
  insurancePerYear: 2000,
  maintenancePerKm: 0.05,
  winterTireSet: 0,
  tireSet: 1000,
  tireLifeKm: 50000,
  repairsPerYear: 600,
  warrantyYears: 3,
  homeChargerCost: 0,
  phevElectricShare: 0,
  retentionYear1: 0.8,
  retentionYearly: 0.9,
  ageAtStart: 0,
};

export default function HowWeCalculate() {
  const ex = calculateColumn(exCar, exShared, exCol);
  const sum = (k: "energy" | "insurance" | "maintenance" | "tires" | "repairs" | "registration") => ex.years.reduce((a, y) => a + y[k], 0);
  const principal = 32600 + 1630 - 5000;
  const defaults = Object.values(SOURCES) as Sourced<unknown>[];

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 leading-relaxed sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-accent">Method</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">How we calculate</h1>
      <p className="mt-4 text-lg text-muted">
        DriveTally estimates the full cost of getting and running a car in Alberta over the period you choose. This page lists every
        formula, every default and every source, with the date we checked it. All defaults can be changed on the compare page.
      </p>

      <Toc />

      <H2 id="data">1. Data sources</H2>
      <H3>Vehicles and fuel use</H3>
      <p>
        The vehicle list is Natural Resources Canada&rsquo;s{" "}
        <A href="https://open.canada.ca/data/en/dataset/98f1a129-f628-4ce4-b24d-6f16bf24dd64">Fuel Consumption Ratings</A> (Open Government Licence – Canada),
        downloaded {DATA_DATES.vehicles} through the open.canada.ca data API. We use every model year from {DATA_INFO.firstYear} to {DATA_INFO.lastYear}:{" "}
        <strong>{DATA_INFO.count.toLocaleString("en-CA")} vehicle versions</strong> from {DATA_INFO.makes} makes and {DATA_INFO.families} model families (
        {Object.entries(DATA_INFO.byFuel)
          .map(([k, n]) => `${n.toLocaleString("en-CA")} ${k === "ev" ? "electric" : k === "phev" ? "plug-in hybrid" : k}`)
          .join(", ")}
        ). Each version has NRCan&rsquo;s city and highway ratings in L/100 km (gas, diesel, hybrid), kWh/100 km (electric), or both (plug-in hybrids,
        with electric range).
      </p>
      <p>
        We cross-check every row against the US EPA&rsquo;s <A href="https://www.fueleconomy.gov/feg/download.shtml">fueleconomy.gov</A> data to flag full
        hybrids whose NRCan name doesn&rsquo;t say &ldquo;hybrid&rdquo;, to split small and large SUVs for 2010–2014 (NRCan doesn&rsquo;t), and to fill in
        drive type. The consumption numbers are always NRCan&rsquo;s. Flex-fuel vehicles keep their gasoline rating; their E85 rating is not used. A
        script (<code>npm run data:refresh</code>) repeats the whole import each year and writes a coverage report listing every row it couldn&rsquo;t use.
      </p>
      <H3>Prices</H3>
      <p>
        There is no free, complete list of Canadian car prices, so every version gets a pre-filled price in three steps:
      </p>
      <ol className="ml-6 list-decimal space-y-1">
        <li>
          A <strong>base price for the model family</strong> (the cheapest version&rsquo;s Canadian MSRP, before freight, fees and GST). Where we found the
          published 2026 price in a public Canadian source (maker press releases, Auto123, CarCostCanada, Autotrader.ca research pages) it is marked{" "}
          <strong>verified</strong> with the source and date — {DATA_INFO.verifiedPrices} versions so far. Otherwise it is our estimate from typical
          Canadian launch prices.
        </li>
        <li>
          <strong>Model year:</strong> the base price is moved to the vehicle&rsquo;s year with Statistics Canada&rsquo;s consumer price index for new
          passenger vehicles (once the data refresh has loaded it).
        </li>
        <li>
          <strong>Version:</strong> +7% for AWD/4WD when the family also comes in 2WD; +12% for every two extra cylinders; +15% for a much more powerful
          electric motor; +10% for a hybrid, +30% for a plug-in hybrid and +35% for an electric version when no fuel-specific base price exists; +10% for
          mid trims (XLE, EX-L, Lariat…), +22% for upper trims (Limited, Platinum, Denali…), +50% for high-performance versions (Raptor, Type R, AMG 63…)
          and +90% for top performance versions (Turbo S, Plaid, Hellcat…). Total adjustment is capped at 2.5×. Well-known performance trims have their own
          base price instead.
        </li>
      </ol>
      <p>
        <strong>Used cars:</strong> a model year older than the newest one sold can only be bought used, so its pre-filled price is the original MSRP
        times the share of value kept at its age (see depreciation below). The site always shows whether a price is verified, estimated or yours. A paid
        price service (such as Canadian Black Book) would give exact trim and used prices; it is not used here.
      </p>
      <H3>Photos</H3>
      <p>
        Photos come from Wikimedia Commons, using the lead image of the model&rsquo;s Wikipedia article. Only Creative Commons or public-domain photos
        are used, and the photographer and licence are shown under each one. The photo shows the model, not always the exact year or trim. If no free
        photo exists, we draw a body-type outline instead.
      </p>

      <H2 id="formulas">2. Formulas</H2>
      <Formula title="Distance">Yearly km = km per driving day × days per week × 52 (or the yearly figure you enter).</Formula>
      <Formula title="Energy use">
        Mixed rating = city rating × city share + highway rating × (1 − city share).
        <br />
        Winter: rating × (1 + winter effect × winter months ÷ 12). Defaults: +{pct(SOURCES.winterPenaltyGas.value)} gas, +
        {pct(SOURCES.winterPenaltyHybrid.value)} hybrid, +{pct(SOURCES.winterPenaltyEv.value)} electric.
      </Formula>
      <Formula title="Fuel and electricity cost (year y)">
        Gas: km ÷ 100 × L/100 km × price per litre × (1 + yearly increase)<sup>y−1</sup>. Premium-fuel cars use the premium price.
        <br />
        Electric: km ÷ 100 × kWh/100 km × (home share × home price + public share × public price) × (1 + yearly increase)<sup>y−1</sup>. NRCan&rsquo;s
        kWh ratings already include charging losses.
        <br />
        Plug-in hybrid: the electric share of km at the electric rating, the rest at the gas rating. Default electric share = electric range (shortened in
        winter) ÷ km per driving day, up to 95%, and 30% of that without home charging.
      </Formula>
      <Formula title="Running costs (every payment option)">
        Fuel or electricity + insurance + maintenance + tires + repairs + registration (+ Alberta EV tax for electric cars) + parking + a home charger
        (one-time, electric and plug-in hybrid with home charging).
        <br />
        Tires: winter tires on rims at the start; each set wears only in its own season and is replaced every {SOURCES.tireLifeKm.value.toLocaleString("en-CA")} km.
        <br />
        Repairs: a yearly reserve once the car is older than its {SOURCES.warrantyYears.value}-year basic warranty.
      </Formula>
      <Formula title="Loan">
        Amount borrowed = price + fees + luxury tax + GST − rebate − down payment − trade-in. GST = 5% × (price + fees + luxury tax − trade-in).
        <br />
        Monthly payment = P × r ÷ (1 − (1 + r)<sup>−n</sup>), with r = APR ÷ 12.
        <br />
        <strong>Loan total = down payment + trade-in + payments made in the period + balance still owing at the end.</strong> Interest is shown as its own
        line.
      </Formula>
      <Formula title="Lease">
        Capitalized cost = price + fees + acquisition fee + luxury tax − down payment − rebate. Residual = residual % × MSRP.
        <br />
        Payment = (capitalized cost − residual) ÷ term + (capitalized cost + residual) × money factor, where money factor = lease rate (%) ÷ 2400. GST
        (5%) is added to each payment and to the down payment.
        <br />
        <strong>Lease total = down payment + payments in the period + disposition fee + extra-km charges</strong> (all with GST), counting only the years
        you chose. If the lease is shorter than the period we assume a similar new lease. <strong>Buyout at residual</strong> is shown for information and
        never added to the total.
      </Formula>
      <Formula title="Cash">
        Price + fees + luxury tax + GST − rebate. By the team&rsquo;s rule a cash purchase is a sunk cost, so by default the price is <strong>not</strong>{" "}
        added (and resale is not subtracted). Turn on &ldquo;Include purchase price for cash&rdquo; to add both.
      </Formula>
      <Formula title="Taxes and rebates">
        GST 5%, no PST in Alberta. Federal luxury tax on cars over $100,000: the lesser of 10% of the price and 20% of the amount over $100,000. Federal EV
        rebate (EVAP): ${SOURCES.evap.value.ev.toLocaleString("en-CA")} electric, ${SOURCES.evap.value.phev.toLocaleString("en-CA")} plug-in hybrid, new cars
        with a final price of ${SOURCES.evap.value.cap.toLocaleString("en-CA")} or less; leases of 48+ months get the full amount, 36 / 24 / 12 months get
        75% / 50% / 25%. It drops to ${SOURCES.evap.value.from2027.ev.toLocaleString("en-CA")} / ${SOURCES.evap.value.from2027.phev.toLocaleString("en-CA")}{" "}
        on January 1, 2027. Alberta has no provincial rebate.
      </Formula>
      <Formula title="Depreciation and resale">
        Value kept after t years = 1 − (1 − Y1) × t in year 1, then Y1 × R<sup>t−1</sup> to year 5, then a slower rate (R + 3 points). Defaults: Y1 ={" "}
        {pct(SOURCES.retention.value.year1)}, R = {pct(SOURCES.retention.value.yearly)} — about {pct(0.78 * 0.89 ** 2)} after 3 years and{" "}
        {pct(0.78 * 0.89 ** 4)} after 5. Toyota, Lexus, Honda, Subaru, Porsche, Jeep and pickups keep a little more (+4 points in year 1, +2 points a
        year); some European luxury brands keep less; electric cars keep less (−6 and −3 points). Resale = original MSRP × value kept at the end.
      </Formula>
      <Formula title="Results">
        Net cost = total − resale (loan, and cash when the price is included). Per month = net cost ÷ months. Per km = net cost ÷ km driven.
        <br />
        &ldquo;Lowest cost&rdquo; goes to the lowest net cost; if any cash column leaves out its price, it compares running costs only.
        <br />
        The chart shows, for each year, what you would have spent if you stopped then: everything paid so far, plus any loan balance, minus the
        car&rsquo;s value at that time.
      </Formula>

      <H2 id="example">3. Worked example, step by step</H2>
      <p>
        A $30,000 gas sedan (10 L/100 km city, 6 highway), bought new with a loan: $5,000 down, 6% APR, 60 months. 20,000 km a year, half
        city, 5 years, no winter months and no price increases, to keep the arithmetic simple. This is &ldquo;Example 3&rdquo; in our automated tests.
      </p>
      <table className="mt-4 w-full text-sm">
        <tbody className="[&_td]:border-b [&_td]:border-line [&_td]:py-2 [&_td:last-child]:text-right">
          <Tr k="Price + freight ($2,000) + doc fee ($500) + levies ($100)" v={money(32600)} />
          <Tr k="GST 5% × $32,600" v={money(1630)} />
          <Tr k="Borrowed: $32,600 + $1,630 − $5,000 down" v={money(principal)} />
          <Tr k="Payment: $29,230 × 0.005 ÷ (1 − 1.005⁻⁶⁰)" v={`${money2(loanPayment(principal, 0.06, 60))}/month`} />
          <Tr k="60 payments" v={money(ex.paymentsInPeriod)} />
          <Tr k="… of which interest" v={money(ex.interestPaid)} />
          <Tr k="Fuel: (10 + 6) ÷ 2 = 8 L/100 km → 1,600 L a year × $1.50 × 5 years" v={money(sum("energy"))} />
          <Tr k="Insurance $2,000 × 5" v={money(sum("insurance"))} />
          <Tr k="Maintenance 20,000 km × $0.05 × 5" v={money(sum("maintenance"))} />
          <Tr k="Tires: new set at 60,000 and 100,000 km" v={money(sum("tires"))} />
          <Tr k="Repairs after the 3-year warranty: 2 × $600" v={money(sum("repairs"))} />
          <Tr k="Registration $93 × 5" v={money(sum("registration"))} />
          <Tr k="Total = $5,000 down + payments + running costs" v={<strong>{money(ex.totalCost)}</strong>} />
          <Tr k="Resale: $30,000 × 0.8 × 0.9⁴" v={`− ${money(ex.resaleValue)}`} />
          <Tr k="Net cost" v={<strong>{money(ex.netCost)}</strong>} />
          <Tr k="Per month (÷ 60) and per km (÷ 100,000)" v={`${money(ex.perMonth)} · ${money2(ex.perKm)}/km`} />
        </tbody>
      </table>
      <p className="mt-4 text-sm text-muted">
        Eight such examples (gas and electric; loan, lease and cash) are checked automatically every time the code changes (
        <code>src/lib/calc/calc.test.ts</code>).
      </p>

      <H2 id="defaults">4. Default values and sources</H2>
      <p>All checked {DATA_DATES.defaults}. &ldquo;Estimate&rdquo; means our own judgment, explained in the note.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-fg">
              <th className="py-2 pr-4">Item</th>
              <th className="py-2 pr-4">Default</th>
              <th className="py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {defaults.map((d) => (
              <tr key={d.label} className="border-b border-line align-top">
                <td className="py-2 pr-4">{d.label}</td>
                <td className="py-2 pr-4 whitespace-nowrap">{showValue(d)}</td>
                <td className="py-2">
                  <span className={d.status === "estimate" ? "text-muted" : ""}>{d.status === "estimate" ? "Estimate: " : ""}</span>
                  {d.url ? <A href={d.url}>{d.source}</A> : d.source}
                  {d.note && <span className="block text-xs text-muted">{d.note}</span>}
                </td>
              </tr>
            ))}
            <tr className="border-b border-line align-top">
              <td className="py-2 pr-4">Maintenance per km</td>
              <td className="py-2 pr-4">
                {Object.entries(MAINTENANCE_PER_KM)
                  .map(([k, v]) => `${k} ${money2(v)}`)
                  .join(", ")}
              </td>
              <td className="py-2">
                Estimate based on <A href={MAINTENANCE_SOURCE.url}>{MAINTENANCE_SOURCE.source}</A>. ×1.05–1.2 for bigger vehicles, ×1.3 for luxury brands.
              </td>
            </tr>
            <tr className="border-b border-line align-top">
              <td className="py-2 pr-4">Insurance per year</td>
              <td className="py-2 pr-4">Alberta average × (value ÷ $25,000)<sup>0.35</sup></td>
              <td className="py-2">
                Estimate built on the AIRB average above, × 1.25 for sports cars. Real quotes vary a lot with the driver; always use your own.
              </td>
            </tr>
            <tr className="border-b border-line align-top">
              <td className="py-2 pr-4">Winter tires on rims / replacement set</td>
              <td className="py-2 pr-4">
                {money(CLASS_FACTORS["car-compact"].winterSet)} / {money(CLASS_FACTORS["car-compact"].tireSet)} (compact car) to{" "}
                {money(CLASS_FACTORS["pickup-large"].winterSet)} / {money(CLASS_FACTORS["pickup-large"].tireSet)} (full-size pickup)
              </td>
              <td className="py-2">Estimate from typical Alberta retail prices.</td>
            </tr>
            <tr className="border-b border-line align-top">
              <td className="py-2 pr-4">Repairs reserve after warranty</td>
              <td className="py-2 pr-4">$600/year ($450 electric), ×1.5 luxury brands</td>
              <td className="py-2">Estimate.</td>
            </tr>
            <tr className="border-b border-line align-top">
              <td className="py-2 pr-4">Loan down payment</td>
              <td className="py-2 pr-4">10% of price</td>
              <td className="py-2">DriveTally default.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H2 id="limits">5. Limits</H2>
      <ul className="ml-6 list-disc space-y-1">
        <li>Prices marked &ldquo;estimate&rdquo; can be off by 10–20% for a given trim. Use your dealer quote.</li>
        <li>Insurance depends mostly on the driver, not the car. Our figure is a starting point only.</li>
        <li>Used prices depend on kilometres, condition and options; ours follow an average depreciation curve.</li>
        <li>Fuel and electricity prices change daily. Alberta&rsquo;s fuel tax was suspended from October 1, 2026, which may not last.</li>
        <li>Costs are not discounted for the time value of money; a dollar in year 5 counts the same as a dollar today.</li>
        <li>Rebate eligibility depends on where the car was built and on its final price; confirm with the dealer.</li>
      </ul>
    </article>
  );
}

function showValue(d: Sourced<unknown>) {
  const v = d.value;
  if (typeof v !== "number") {
    if (d.label.startsWith("Federal EV")) return "$5,000 EV / $2,500 PHEV";
    if (d.label.startsWith("Value kept")) return "78% after 1 yr, then 89%/yr";
    return "";
  }
  if (/\$\/L|\$\/kWh|\(\$\/kWh\)|\(\$\/L\)/.test(d.label)) return `$${v.toFixed(2)}`;
  if (v > 0 && v < 1) return pct(v, v < 0.1 ? 1 : 0);
  if (/fee|tax|PDI|charger|registration|premium|levy|threshold/i.test(d.label)) return money(v);
  return v.toLocaleString("en-CA");
}

function Toc() {
  const items = [
    ["data", "Data sources"],
    ["formulas", "Formulas"],
    ["example", "Worked example"],
    ["defaults", "Default values and sources"],
    ["limits", "Limits"],
  ];
  return (
    <nav aria-label="On this page" className="mt-8 border-y border-line py-4 text-sm">
      <ol className="flex flex-wrap gap-x-6 gap-y-2">
        {items.map(([id, label], i) => (
          <li key={id}>
            <a href={`#${id}`} className="hover:text-accent">
              {i + 1}. {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

const H2 = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="mt-14 scroll-mt-6 border-t border-fg pt-6 text-2xl font-semibold tracking-tight">
    {children}
  </h2>
);
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="mt-6 text-lg font-semibold">{children}</h3>;
const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="underline decoration-line underline-offset-2 hover:text-accent" target="_blank" rel="noreferrer">
    {children}
  </a>
);
const Formula = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-5">
    <h3 className="font-semibold">{title}</h3>
    <p className="mt-1 text-[15px]">{children}</p>
  </div>
);
const Tr = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <tr>
    <td className="pr-4">{k}</td>
    <td className="whitespace-nowrap">{v}</td>
  </tr>
);
