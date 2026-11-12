"use client";
// "Where the money goes": one segmented bar per car, splitting its net cost into six parts. All numbers come from
// results the calculation already produced; bars share one scale, so their lengths compare across cars.
import { money } from "@/lib/format";

export interface MoneyParts {
  name: string;
  total: number; // net cost
  parts: number[]; // same order as PARTS
  note?: string;
}

// Colour-blind-checked categorical palette (fixed order); values are also shown in the table below the bars.
export const PARTS = [
  { label: "The car itself", hint: "what you pay for it, less what it sells for", color: "#2a78d6" },
  { label: "Loan interest", hint: "", color: "#eb6834" },
  { label: "Fuel and electricity", hint: "", color: "#1baf7a" },
  { label: "Insurance", hint: "", color: "#eda100" },
  { label: "Maintenance and repairs", hint: "", color: "#e87ba4" },
  { label: "Tires, registration and other", hint: "", color: "#008300" },
];

export function MoneyChart({ cars, years }: { cars: MoneyParts[]; years: number }) {
  if (!cars.length) return null;
  const scale = Math.max(...cars.map((c) => c.parts.reduce((a, p) => a + Math.max(0, p), 0)), 1);
  return (
    <section aria-labelledby="money-title" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
      <h2 id="money-title" className="text-xl font-semibold">
        Where the money goes
      </h2>
      <p className="mt-1 text-sm text-muted">Each car&rsquo;s real cost over {years} year{years > 1 ? "s" : ""}, split into its parts. Longer bars cost more. &ldquo;The car itself&rdquo; is what you pay for it, less what it sells for.</p>
      <div className="mt-6 space-y-5">
        {cars.map((c) => (
          <div key={c.name}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">{c.name}</span>
              <span className="font-semibold tabular-nums">{money(c.total)}</span>
            </div>
            <div className="mt-1.5 flex h-6 gap-0.5" role="img" aria-label={`${c.name}: ${PARTS.map((p, i) => `${p.label} ${money(c.parts[i])}`).join(", ")}`}>
              {c.parts.map((v, i) =>
                v > 0 ? (
                  <span
                    key={PARTS[i].label}
                    title={`${PARTS[i].label}: ${money(v)}`}
                    className="h-full first:rounded-l last:rounded-r"
                    style={{ width: `${(v / scale) * 100}%`, backgroundColor: PARTS[i].color }}
                  />
                ) : null,
              )}
            </div>
            {c.note && <p className="mt-1 text-xs text-muted">{c.note}</p>}
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className={`w-full border-collapse text-sm ${cars.length > 2 ? "min-w-[36rem]" : ""}`}>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="py-2 pr-4 font-medium">Part of the cost</th>
              {cars.map((c) => (
                <th key={c.name} scope="col" className="py-2 pl-2 text-right font-medium sm:pl-4">{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PARTS.map((p, i) => (
              <tr key={p.label} className="border-b border-line">
                <th scope="row" className="py-2 pr-2 text-left font-normal sm:pr-4">
                  <span aria-hidden className="mr-2 inline-block h-3 w-3 rounded-sm align-middle" style={{ backgroundColor: p.color }} />
                  {p.label}
                  {p.hint && <span className="hidden text-muted sm:inline"> ({p.hint})</span>}
                </th>
                {cars.map((c) => (
                  <td key={c.name} className="py-2 pl-4 text-right tabular-nums">{c.parts[i] > 0 ? money(c.parts[i]) : "—"}</td>
                ))}
              </tr>
            ))}
            <tr className="font-semibold">
              <th scope="row" className="py-2 pr-4 text-left">Real cost</th>
              {cars.map((c) => (
                <td key={c.name} className="py-2 pl-4 text-right tabular-nums">{money(c.total)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
