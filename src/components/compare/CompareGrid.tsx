"use client";
// The side-by-side comparison: sticky column headers, then collapsible sections of rows that line up across columns.
// On phones the columns scroll sideways (with snap) and the header scrolls with them.
import { useEffect, useRef, useState } from "react";
import {
  blended,
  retention,
  type ColumnInputs,
  type ColumnResult,
  type Overrides,
  type Payment,
  type SharedInputs,
} from "@/lib/calc";
import { electricUse, fuelUse, int, money, pct, perDistance } from "@/lib/format";
import { MAX_COLUMNS } from "@/lib/state";
import { KM_PER_MI, useUnits, type Units } from "@/lib/units";
import type { Photo, Vehicle } from "@/lib/vehicle-types";
import { BodyOutline } from "./BodyOutline";
import { Chevron, InfoTip, NumberField } from "./controls";

export interface Col {
  key: string;
  v: Vehicle & { photo?: Photo | null };
  inputs: ColumnInputs;
  result: ColumnResult;
  overrides: Overrides;
  setOverride: <K extends keyof ColumnInputs>(k: K, val: ColumnInputs[K]) => void;
  resetOverride: (k: keyof ColumnInputs) => void;
  setPayment: (p: Payment) => void;
  remove: () => void;
}

interface Row {
  id: string;
  label: React.ReactNode;
  tip?: React.ReactNode;
  applies?: (c: Col) => boolean;
  cell: (c: Col) => React.ReactNode;
  text: (c: Col) => string; // plain value, used for "Show differences only"
  strong?: boolean;
  note?: string;
}

interface Section {
  id: string;
  title: string;
  rows: Row[];
}

const FUEL_LABEL: Record<string, string> = { gas: "Gas", hybrid: "Hybrid", phev: "Plug-in hybrid", ev: "Electric", diesel: "Diesel" };

export function CompareGrid({
  cols,
  shared,
  lowest,
  onAdd,
  showDifferences,
}: {
  cols: Col[];
  shared: SharedInputs;
  lowest: { index: number; basis: "net" | "running" } | null;
  onAdd: () => void;
  showDifferences: boolean;
}) {
  const { units } = useUnits();
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  // Once the photos have scrolled out of view, the sticky header shrinks to name + payment option
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: "-260px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Keep the header and the rows scrolled together sideways (phones)
  useEffect(() => {
    const h = headRef.current;
    const b = bodyRef.current;
    if (!h || !b) return;
    const fromBody = () => {
      if (h.scrollLeft !== b.scrollLeft) h.scrollLeft = b.scrollLeft;
    };
    const fromHead = () => {
      if (b.scrollLeft !== h.scrollLeft) b.scrollLeft = h.scrollLeft;
    };
    b.addEventListener("scroll", fromBody, { passive: true });
    h.addEventListener("scroll", fromHead, { passive: true });
    return () => {
      b.removeEventListener("scroll", fromBody);
      h.removeEventListener("scroll", fromHead);
    };
  }, []);

  const slots = Math.min(MAX_COLUMNS, cols.length + (cols.length < MAX_COLUMNS ? 1 : 0));
  // Desktop: label column + one column per slot. Phones: no label column (labels sit above each row).
  const gridStyle = { "--slots": slots } as React.CSSProperties;
  const gridClass =
    "grid grid-cols-[repeat(var(--slots),minmax(78vw,1fr))] sm:grid-cols-[repeat(var(--slots),minmax(300px,1fr))] lg:grid-cols-[220px_repeat(var(--slots),minmax(0,1fr))]";

  const sections = buildSections(shared, units);
  const years = shared.years;

  const visible = (r: Row) => {
    const applying = cols.filter((c) => !r.applies || r.applies(c));
    if (!applying.length) return false;
    if (showDifferences && cols.length > 1) {
      const texts = cols.map((c) => (!r.applies || r.applies(c) ? r.text(c) : "—"));
      return texts.some((t) => t !== texts[0]);
    }
    return true;
  };

  return (
    <div className="print-full">
      <div ref={sentinelRef} aria-hidden />
      {/* Sticky column headers */}
      <div className="sticky top-0 z-30 border-b border-line bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)] print:static">
        <div ref={headRef} className="no-scrollbar mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6 print:overflow-visible">
          <div className={gridClass} style={gridStyle}>
            <div className="hidden items-end pb-4 text-sm text-muted lg:flex">
              {cols.length ? `${years}-year cost, Alberta` : "Add up to four vehicles to compare."}
            </div>
            {cols.map((c, i) => (
              <ColumnHeader key={c.key} c={c} compact={compact} isLowest={lowest?.index === i && cols.length > 1} basis={lowest?.basis} />
            ))}
            {cols.length < MAX_COLUMNS && (
              <div className={`snap-start px-2 lg:px-3 ${compact ? "py-2" : "py-4"}`}>
                <button
                  type="button"
                  onClick={onAdd}
                  className={`no-print flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-line text-muted hover:border-fg hover:text-fg ${compact ? "min-h-0 gap-2 py-2" : "min-h-40 flex-col"}`}
                >
                  <span className="text-4xl font-light leading-none">+</span>
                  <span className="mt-2 font-medium">Add vehicle</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={bodyRef} className="no-scrollbar mx-auto max-w-7xl snap-x snap-mandatory overflow-x-auto px-4 sm:px-6 lg:snap-none print:overflow-visible">
        {cols.length === 0 ? (
          <p className="py-16 text-center text-muted">Your comparison is empty. Use “Add vehicle” to start.</p>
        ) : (
          <>
            {/* Summary block, always open */}
            <SummaryRows cols={cols} gridClass={gridClass} gridStyle={gridStyle} units={units} years={years} lowest={lowest} />
            {sections.map((s) => {
              const rows = s.rows.filter(visible);
              if (!rows.length) return null;
              const isOpen = !closed[s.id];
              return (
                <section key={s.id} aria-labelledby={`sec-${s.id}`} className="border-t border-fg">
                  <h3 className="sticky left-0 w-[calc(100vw-2rem)] sm:w-auto">
                    <button
                      id={`sec-${s.id}`}
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setClosed((c) => ({ ...c, [s.id]: isOpen }))}
                      className="flex w-full items-center justify-between py-4 text-left text-lg font-semibold"
                    >
                      {s.title}
                      <Chevron open={isOpen} />
                    </button>
                  </h3>
                  {isOpen &&
                    rows.map((r) => (
                      <div key={r.id} className="border-t border-line">
                        <div className="sticky left-0 w-[calc(100vw-2rem)] px-2 pt-3 text-xs font-medium text-muted sm:w-auto lg:hidden">
                          {r.label}
                          {r.tip && <InfoTip>{r.tip}</InfoTip>}
                        </div>
                        <div className={gridClass} style={gridStyle}>
                          <div className="hidden py-3 pr-4 text-sm lg:block">
                            {r.label}
                            {r.tip && <InfoTip>{r.tip}</InfoTip>}
                          </div>
                          {cols.map((c) => (
                            <div key={c.key} className={`snap-start px-2 py-3 text-sm lg:px-3 ${r.strong ? "font-semibold" : ""}`}>
                              {!r.applies || r.applies(c) ? r.cell(c) : <span className="text-muted">—</span>}
                            </div>
                          ))}
                          {cols.length < MAX_COLUMNS && <div />}
                        </div>
                      </div>
                    ))}
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function ColumnHeader({ c, isLowest, basis, compact }: { c: Col; isLowest: boolean; basis?: "net" | "running"; compact: boolean }) {
  const { v } = c;
  const name = `${v.year} ${v.make} ${v.model}`;
  return (
    <div className={`relative snap-start px-2 lg:px-3 ${compact ? "py-2" : "pb-4 pt-4"}`}>
      <button
        type="button"
        onClick={c.remove}
        aria-label={`Remove ${name}`}
        className="no-print absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-xl leading-none text-muted shadow-sm hover:text-fg"
      >
        ×
      </button>
      <div className={compact ? "hidden" : ""}>
      <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-soft">
        {v.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.photo.url} alt={`${v.make} ${v.family} (photo of the model, may not show this exact year or trim)`} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <BodyOutline body={v.body} className="h-full w-full p-4" />
        )}
      </div>
      {v.photo ? (
        <p className="mt-1 truncate text-[10px] leading-tight text-muted" title={`${v.photo.author}, ${v.photo.license}`}>
          Photo:{" "}
          <a href={v.photo.pageUrl} target="_blank" rel="noreferrer" className="underline">
            {v.photo.author}
          </a>
          ,{" "}
          {v.photo.licenseUrl ? (
            <a href={v.photo.licenseUrl} target="_blank" rel="noreferrer" className="underline">
              {v.photo.license}
            </a>
          ) : (
            v.photo.license
          )}
        </p>
      ) : (
        <p className="mt-1 text-[10px] leading-tight text-muted">No free photo found for this model.</p>
      )}
      </div>
      <h2 className={`pr-9 font-semibold leading-snug ${compact ? "truncate text-sm" : "mt-2 text-base"}`} title={name}>
        {name}
      </h2>
      <p className={`text-xs text-muted ${compact ? "hidden" : ""}`}>
        {FUEL_LABEL[v.fuelType]} · {v.version.split(" · ").slice(1).join(" · ")}
      </p>
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "mt-1" : "mt-3"}`}>
        <div className="inline-flex rounded-full border border-line p-0.5 text-xs" role="group" aria-label={`Payment option for ${name}`}>
          {(["loan", "lease", "cash"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={c.inputs.payment === p}
              onClick={() => c.setPayment(p)}
              className={`rounded-full px-3 py-1 capitalize ${c.inputs.payment === p ? "bg-fg text-white" : "text-muted hover:text-fg"}`}
            >
              {p}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">{c.inputs.condition === "new" ? "New" : "Used"}</span>
        {isLowest && (
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white" title={basis === "running" ? "Lowest running costs" : "Lowest net cost"}>
            Lowest cost
          </span>
        )}
      </div>
    </div>
  );
}

function SummaryRows({
  cols,
  gridClass,
  gridStyle,
  units,
  years,
  lowest,
}: {
  cols: Col[];
  gridClass: string;
  gridStyle: React.CSSProperties;
  units: Units;
  years: number;
  lowest: { index: number; basis: "net" | "running" } | null;
}) {
  const rows: { label: string; val: (c: Col) => React.ReactNode; big?: boolean }[] = [
    {
      label: `Total cost, ${years} years`,
      big: true,
      val: (c) => (
        <>
          <span className="text-2xl font-semibold tracking-tight">{money(c.result.totalCost)}</span>
          {c.result.priceExcluded && <span className="mt-1 block text-xs font-normal text-warn">Purchase price not included — compare running costs for like-for-like.</span>}
        </>
      ),
    },
    { label: "Net cost after resale", val: (c) => (c.result.resaleValue ? money(c.result.netCost) : <span className="text-muted">{money(c.result.netCost)} (no resale)</span>) },
    { label: "Per month", val: (c) => money(c.result.perMonth) },
    { label: units === "km" ? "Per kilometre" : "Per mile", val: (c) => perDistance(c.result.perKm, units) },
    { label: "Running costs only", val: (c) => <span className="font-semibold">{money(c.result.runningCost)}</span> },
  ];
  return (
    <div className="pb-4 pt-2">
      {rows.map((r) => (
        <div key={r.label} className="border-t border-line first:border-t-0">
          <div className="sticky left-0 w-[calc(100vw-2rem)] px-2 pt-3 text-xs font-medium text-muted sm:w-auto lg:hidden">{r.label}</div>
          <div className={gridClass} style={gridStyle}>
            <div className="hidden py-3 pr-4 text-sm lg:block">{r.label}</div>
            {cols.map((c) => (
              <div key={c.key} className="snap-start px-2 py-3 text-sm lg:px-3">
                {r.val(c)}
              </div>
            ))}
            {cols.length < MAX_COLUMNS && <div />}
          </div>
        </div>
      ))}
      {lowest && cols.length > 1 && (
        <p className="sticky left-0 pt-2 text-xs text-muted">
          “Lowest cost” compares {lowest.basis === "net" ? "net cost after resale" : "running costs only, because a cash column leaves out its purchase price"}.
        </p>
      )}
    </div>
  );
}

// ---------- row definitions ----------

function buildSections(shared: SharedInputs, units: Units): Section[] {
  const is = (...p: Payment[]) => (c: Col) => p.includes(c.inputs.payment);
  const plugIn = (c: Col) => c.v.fuelType === "ev" || c.v.fuelType === "phev";

  // An editable money/number cell bound to one column input
  const edit = (k: keyof ColumnInputs, opts: Partial<Parameters<typeof NumberField>[0]> = {}) =>
    function EditCell(c: Col) {
      return (
        <NumberField
          label={String(k)}
          value={c.inputs[k] as number}
          changed={k in c.overrides}
          onChange={(val) => c.setOverride(k, val as never)}
          onReset={() => c.resetOverride(k)}
          {...opts}
        />
      );
    };
  const moneyEdit = (k: keyof ColumnInputs) => edit(k, { prefix: "$", min: 0, max: 20_000_000, step: 100 });
  const txt = (k: keyof ColumnInputs) => (c: Col) => String(c.inputs[k]);
  const resultMoney = (k: keyof ColumnResult) => ({ cell: (c: Col) => money(c.result[k] as number), text: (c: Col) => money(c.result[k] as number) });
  const sum = (c: Col, k: keyof ColumnResult["years"][number]) => c.result.years.reduce((a, y) => a + (y[k] as number), 0);

  return [
    {
      id: "getting",
      title: "Getting the car",
      rows: [
        {
          id: "condition",
          label: "New or used",
          tip: "Older model years can only be bought used, so we pre-fill an estimated used price: the original MSRP less depreciation. Leases are always new.",
          cell: (c) =>
            c.inputs.payment === "lease" ? (
              "New (lease)"
            ) : (
              <select
                aria-label="New or used"
                value={c.inputs.condition}
                onChange={(e) => c.setOverride("condition", e.target.value as "new" | "used")}
                className="rounded-md border border-line bg-white px-2 py-1"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            ),
          text: (c) => c.inputs.condition,
        },
        {
          id: "price",
          label: "Price",
          tip: "New: manufacturer's suggested retail price (MSRP) before freight, fees and GST. Used: estimated market price today. Every price is pre-filled; change it to the price you were quoted.",
          cell: (c) => (
            <div>
              {moneyEdit("price")(c)}
              <PriceStatus c={c} />
            </div>
          ),
          text: txt("price"),
        },
        { id: "freight", label: "Freight and PDI", tip: "Delivery and pre-delivery inspection, set by the maker. New cars only.", cell: moneyEdit("freightPdi"), text: txt("freightPdi") },
        { id: "doc", label: "Dealer documentation fee", tip: "Varies by dealer ($300–$1,000) and can be negotiated.", cell: moneyEdit("docFee"), text: txt("docFee") },
        { id: "levies", label: "A/C tax and tire levy", tip: "Federal $100 air-conditioner excise tax and Alberta's $4 per tire recycling fee. New cars only.", cell: moneyEdit("levies"), text: txt("levies") },
        {
          id: "luxury",
          label: "Federal luxury tax",
          tip: "Cars over $100,000: the lesser of 10% of the price or 20% of the amount over $100,000.",
          applies: (c) => c.inputs.luxuryTax > 0 || "luxuryTax" in c.overrides,
          cell: moneyEdit("luxuryTax"),
          text: txt("luxuryTax"),
        },
        {
          id: "gst",
          label: "GST (5%)",
          tip: "Alberta has no PST. Buying: GST on price + fees − trade-in. Leasing: GST on each payment and on the down payment.",
          cell: (c) => (c.inputs.payment === "lease" ? <span>{money(c.result.gst)} <span className="text-xs text-muted">over the period</span></span> : money(c.result.gst)),
          text: (c) => money(c.result.gst),
        },
        {
          id: "rebate",
          label: "Federal EV rebate (EVAP)",
          tip: "Up to $5,000 for electric and $2,500 for plug-in hybrids bought or leased new in 2026, if the final price is $50,000 or less (no cap for Canadian-made) and the car is made in Canada or a free-trade partner country. One per person. Leases under 48 months get less. Check eligibility for your exact car.",
          applies: plugIn,
          cell: moneyEdit("rebate"),
          text: txt("rebate"),
        },
        { id: "down", label: "Down payment", applies: is("loan", "lease"), cell: moneyEdit("downPayment"), text: txt("downPayment") },
        { id: "trade", label: "Trade-in value", tip: "Reduces the amount GST is charged on.", applies: is("loan"), cell: moneyEdit("tradeIn"), text: txt("tradeIn") },
      ],
    },
    {
      id: "financing",
      title: "Financing",
      rows: [
        { id: "apr", label: "Loan rate (APR)", applies: is("loan"), cell: edit("apr", { suffix: "%", percent: true, decimals: 2, min: 0, max: 0.4 }), text: txt("apr") },
        { id: "loanTerm", label: "Loan term", applies: is("loan"), cell: edit("loanTermMonths", { suffix: "months", min: 6, max: 96 }), text: txt("loanTermMonths") },
        { id: "leaseRate", label: "Lease rate", tip: "Money factor = lease rate ÷ 2400.", applies: is("lease"), cell: edit("leaseRate", { suffix: "%", percent: true, decimals: 2, min: 0, max: 0.4 }), text: txt("leaseRate") },
        { id: "leaseTerm", label: "Lease term", applies: is("lease"), cell: edit("leaseTermMonths", { suffix: "months", min: 12, max: 96 }), text: txt("leaseTermMonths") },
        { id: "residual", label: "Residual value", tip: "Share of MSRP the leasing company expects the car to be worth at the end. Default: our depreciation curve, slightly lowered.", applies: is("lease"), cell: edit("residualPct", { suffix: "% of MSRP", percent: true, decimals: 1, min: 0, max: 1 }), text: txt("residualPct") },
        {
          id: "allowance",
          label: units === "km" ? "Km allowance per year" : "Mile allowance per year",
          applies: is("lease"),
          cell: (c) =>
            units === "km" ? (
              edit("kmAllowancePerYear", { suffix: "km", step: 1000, min: 0 })(c)
            ) : (
              <NumberField
                label="Mile allowance"
                value={c.inputs.kmAllowancePerYear / KM_PER_MI}
                changed={"kmAllowancePerYear" in c.overrides}
                onChange={(val) => c.setOverride("kmAllowancePerYear", val * KM_PER_MI)}
                onReset={() => c.resetOverride("kmAllowancePerYear")}
                suffix="mi"
              />
            ),
          text: txt("kmAllowancePerYear"),
        },
        { id: "excessRate", label: units === "km" ? "Charge per extra km" : "Charge per extra km (CAD)", applies: is("lease"), cell: edit("excessKmRate", { prefix: "$", decimals: 2, min: 0 }), text: txt("excessKmRate") },
        { id: "acq", label: "Acquisition fee", applies: is("lease"), cell: moneyEdit("acquisitionFee"), text: txt("acquisitionFee") },
        { id: "disp", label: "Disposition fee (at lease end)", applies: is("lease"), cell: moneyEdit("dispositionFee"), text: txt("dispositionFee") },
        {
          id: "monthly",
          label: "Monthly payment",
          applies: is("loan", "lease"),
          strong: true,
          cell: (c) => (
            <span>
              {money(c.result.monthlyPayment)}
              {c.inputs.payment === "lease" && <span className="ml-1 text-xs font-normal text-muted">incl. GST</span>}
            </span>
          ),
          text: (c) => money(c.result.monthlyPayment),
        },
        { id: "payments", label: `Payments made in ${shared.years} years`, applies: is("loan", "lease"), ...resultMoney("paymentsInPeriod") },
        { id: "interest", label: "Interest paid", applies: is("loan"), ...resultMoney("interestPaid") },
        { id: "leaseFees", label: "Lease fees (incl. GST)", applies: is("lease"), ...resultMoney("leaseFees") },
        { id: "excess", label: units === "km" ? "Extra km charges" : "Extra mileage charges", applies: is("lease"), ...resultMoney("excessKmCharge") },
        {
          id: "cashNote",
          label: "Financing",
          applies: is("cash"),
          cell: () => <span className="text-muted">None — paid in full</span>,
          text: () => "none",
        },
      ],
    },
    {
      id: "running",
      title: "Running costs",
      rows: [
        {
          id: "rating",
          label: "Energy use (NRCan rating, your mix and winter)",
          tip: "NRCan city and highway ratings, weighted by your city/highway split, plus the winter effect for your winter months.",
          cell: (c) => <EnergyRating c={c} shared={shared} units={units} />,
          text: (c) => `${c.v.cityL}-${c.v.hwyL}-${c.v.cityKwh}-${c.v.hwyKwh}`,
        },
        {
          id: "phevShare",
          label: "Driven on electricity",
          tip: "Default from the car's electric range (less in winter) and your daily km, assuming you charge every night. Change it to match your driving.",
          applies: (c) => c.v.fuelType === "phev",
          cell: edit("phevElectricShare", { suffix: "%", percent: true, min: 0, max: 1 }),
          text: txt("phevElectricShare"),
        },
        {
          id: "energy",
          label: "Fuel and electricity",
          cell: (c) => <Total total={sum(c, "energy")} first={c.result.years[0]?.energy} />,
          text: (c) => money(sum(c, "energy")),
        },
        { id: "insYear", label: "Insurance per year", tip: "Estimate: Alberta average premium ($1,903 in 2025) scaled by the car's value and class. Real quotes vary a lot — use your own.", cell: moneyEdit("insurancePerYear"), text: txt("insurancePerYear") },
        { id: "ins", label: "Insurance", cell: (c) => money(sum(c, "insurance")), text: (c) => money(sum(c, "insurance")) },
        { id: "mntRate", label: units === "km" ? "Maintenance per km" : "Maintenance per km (CAD)", tip: "Oil, brakes, filters and scheduled service. Electric cars need less.", cell: edit("maintenancePerKm", { prefix: "$", decimals: 3, min: 0 }), text: txt("maintenancePerKm") },
        { id: "mnt", label: "Maintenance", cell: (c) => money(sum(c, "maintenance")), text: (c) => money(sum(c, "maintenance")) },
        { id: "winterSet", label: "Winter tires on rims (bought at start)", applies: () => shared.winterMonths > 0, cell: moneyEdit("winterTireSet"), text: txt("winterTireSet") },
        { id: "tireSet", label: "Replacement set of tires", cell: moneyEdit("tireSet"), text: txt("tireSet") },
        { id: "tires", label: "Tires", tip: "Winter set at the start, then each set is replaced when it reaches its tire life.", cell: (c) => money(sum(c, "tires")), text: (c) => money(sum(c, "tires")) },
        { id: "repairsRate", label: "Repairs reserve per year after warranty", cell: moneyEdit("repairsPerYear"), text: txt("repairsPerYear") },
        { id: "repairs", label: "Repairs", cell: (c) => money(sum(c, "repairs")), text: (c) => money(sum(c, "repairs")) },
        { id: "reg", label: "Registration (and Alberta EV tax)", cell: (c) => money(sum(c, "registration")), text: (c) => money(sum(c, "registration")) },
        { id: "parking", label: "Parking", applies: () => shared.parkingPerMonth > 0, cell: (c) => money(sum(c, "parking")), text: (c) => money(sum(c, "parking")) },
        {
          id: "charger",
          label: "Home charger (one-time)",
          applies: (c) => plugIn(c) && shared.homeCharging,
          cell: moneyEdit("homeChargerCost"),
          text: txt("homeChargerCost"),
        },
        { id: "runningTotal", label: "Running costs total", strong: true, ...resultMoney("runningCost") },
      ],
    },
    {
      id: "end",
      title: "End of period",
      rows: [
        { id: "balance", label: "Loan balance still owing", tip: "Included in the total: you would have to pay it off.", applies: is("loan"), ...resultMoney("loanBalanceAtEnd") },
        {
          id: "kept",
          label: "Value kept after the period",
          tip: "Share of the original MSRP the car is still worth, from our depreciation curve (Canadian Black Book averages, adjusted by brand and fuel type). Change the curve with the two numbers below.",
          applies: (c) => is("loan", "cash")(c) && !c.result.priceExcluded,
          cell: (c) => pct(retention(c.inputs.ageAtStart + shared.years, c.inputs.retentionYear1, c.inputs.retentionYearly), 0),
          text: (c) => pct(retention(c.inputs.ageAtStart + shared.years, c.inputs.retentionYear1, c.inputs.retentionYearly), 0),
        },
        {
          id: "ret1",
          label: "Value kept after year 1",
          applies: (c) => is("loan", "cash")(c) && !c.result.priceExcluded,
          cell: edit("retentionYear1", { suffix: "%", percent: true, min: 0, max: 1 }),
          text: txt("retentionYear1"),
        },
        {
          id: "retY",
          label: "Value kept each later year",
          applies: (c) => is("loan", "cash")(c) && !c.result.priceExcluded,
          cell: edit("retentionYearly", { suffix: "%", percent: true, min: 0, max: 1 }),
          text: txt("retentionYearly"),
        },
        { id: "resale", label: "Estimated resale value", applies: (c) => is("loan", "cash")(c) && !c.result.priceExcluded, ...resultMoney("resaleValue") },
        {
          id: "buyout",
          label: "Buyout at residual (not in total)",
          tip: "What it would cost to buy the car at the end of the lease (residual + GST). Shown for information only and not added to the total.",
          applies: is("lease"),
          cell: (c) => <span className="text-muted">{money(c.result.leaseBuyout)}</span>,
          text: (c) => money(c.result.leaseBuyout),
        },
        { id: "net", label: "Net cost", strong: true, ...resultMoney("netCost") },
        {
          id: "km",
          label: units === "km" ? "Total distance" : "Total distance",
          cell: (c) => (units === "km" ? `${int(c.result.totalKm)} km` : `${int(c.result.totalKm / KM_PER_MI)} mi`),
          text: (c) => String(c.result.totalKm),
        },
        {
          id: "notes",
          label: "Notes",
          applies: (c) => c.result.notes.some((n) => !n.startsWith("Purchase price")),
          cell: (c) => (
            <ul className="space-y-1 text-xs text-muted">
              {c.result.notes
                .filter((n) => !n.startsWith("Purchase price"))
                .map((n) => (
                  <li key={n}>{n}</li>
                ))}
            </ul>
          ),
          text: (c) => c.result.notes.join(" "),
        },
      ],
    },
  ];
}

function Total({ total, first }: { total: number; first?: number }) {
  return (
    <span>
      {money(total)}
      {first !== undefined && <span className="block text-xs text-muted">year 1: {money(first)}</span>}
    </span>
  );
}

function PriceStatus({ c }: { c: Col }) {
  const { v, inputs } = c;
  if ("price" in c.overrides) return <span className="mt-1 block text-xs text-muted">Your price</span>;
  if (inputs.condition === "used") {
    return (
      <span className="mt-1 block text-xs text-muted">
        Estimated used price
        <InfoTip>
          Original MSRP {money(v.msrp)} × {pct(retention(inputs.ageAtStart, inputs.retentionYear1, inputs.retentionYearly), 0)} value kept after about{" "}
          {inputs.ageAtStart.toFixed(1)} years. Real used prices depend on kilometres, condition and options.
        </InfoTip>
      </span>
    );
  }
  return v.msrpStatus === "verified" ? (
    <span className="mt-1 block text-xs text-accent">
      ✓ Verified MSRP
      <InfoTip>
        Published base price for this model year: {v.msrpSource}, checked {v.msrpChecked}.{" "}
        {v.msrpSourceUrl && (
          <a className="break-all text-accent underline" href={v.msrpSourceUrl} target="_blank" rel="noreferrer">
            {v.msrpSourceUrl}
          </a>
        )}
      </InfoTip>
    </span>
  ) : (
    <span className="mt-1 block text-xs text-muted">
      Estimated MSRP
      <InfoTip>
        How we estimated it: {v.msrpBasis}.{v.msrpSource ? ` Base price from ${v.msrpSource} (${v.msrpChecked}).` : ""} See “How we calculate” for the
        rules. Change it if you have a quote.
      </InfoTip>
    </span>
  );
}

function EnergyRating({ c, shared, units }: { c: Col; shared: SharedInputs; units: Units }) {
  const v = c.v;
  const w = shared.winterMonths;
  if (v.fuelType === "ev") {
    return <span>{electricUse(blended(v.cityKwh ?? 0, v.hwyKwh ?? 0, shared.cityShare, w, shared.winterPenaltyEv), units)}</span>;
  }
  const penalty = v.fuelType === "hybrid" || v.fuelType === "phev" ? shared.winterPenaltyHybrid : shared.winterPenaltyGas;
  const gas = fuelUse(blended(v.cityL ?? 0, v.hwyL ?? 0, shared.cityShare, w, penalty), units);
  if (v.fuelType === "phev") {
    return (
      <span>
        {electricUse(blended(v.cityKwh ?? 0, v.hwyKwh ?? 0, shared.cityShare, w, shared.winterPenaltyEv), units)} on battery
        <span className="block">{gas} on gas</span>
        <span className="block text-xs text-muted">Electric range {units === "km" ? `${v.electricRangeKm} km` : `${Math.round((v.electricRangeKm ?? 0) / KM_PER_MI)} mi`}</span>
      </span>
    );
  }
  return (
    <span>
      {gas}
      <span className="block text-xs text-muted">{v.fuelGrade === "premium" ? "Premium fuel" : v.fuelGrade === "diesel" ? "Diesel" : "Regular fuel"}</span>
    </span>
  );
}
