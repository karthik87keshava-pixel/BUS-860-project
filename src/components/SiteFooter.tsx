"use client";
import Link from "next/link";
import { DATA_DATES } from "@/lib/site";
import { useUnits } from "@/lib/units";

export function SiteFooter() {
  const { units, setUnits } = useUnits();
  return (
    <footer className="mt-16 border-t border-line bg-soft text-sm text-muted">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <p className="font-semibold text-fg">Estimates only — not financial advice.</p>
          <p>
            Costs are estimates based on public data and the assumptions on the{" "}
            <Link className="underline hover:text-accent" href="/how-we-calculate">
              How we calculate
            </Link>{" "}
            page. Prices, rates, insurance and rebates change; get real quotes before you decide.
          </p>
          <p>
            Vehicle data: Natural Resources Canada Fuel Consumption Ratings, downloaded {DATA_DATES.vehicles}. Prices and Alberta
            defaults checked {DATA_DATES.defaults}. Car photos: Wikimedia Commons (credits under each photo).
          </p>
          <p className="no-print">A UAlberta EMBA class project (BUS 860). Not affiliated with any car maker or dealer.</p>
        </div>
        <div className="no-print md:text-right">
          <fieldset>
            <legend className="mb-2 text-xs uppercase tracking-wide">Distance units</legend>
            <div className="inline-flex rounded-full border border-line bg-white p-0.5">
              {(["km", "mi"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={units === u}
                  onClick={() => setUnits(u)}
                  className={`rounded-full px-3 py-1 ${units === u ? "bg-fg text-white" : "text-muted hover:text-fg"}`}
                >
                  {u === "km" ? "Kilometres" : "Miles"}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
    </footer>
  );
}
