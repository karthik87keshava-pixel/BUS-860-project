"use client";
// "Your driving" panel: inputs shared by every column.
import { useEffect, useState } from "react";
import { SOURCES, kmPerYear, type SharedInputs, type Sourced } from "@/lib/calc";
import { distance } from "@/lib/format";
import { KM_PER_MI, useUnits } from "@/lib/units";
import { Chevron, InfoTip, NumberField, Toggle } from "./controls";

type Key = keyof SharedInputs;

export function SharedPanel({
  shared,
  changed,
  set,
  reset,
}: {
  shared: SharedInputs;
  changed: Partial<SharedInputs>;
  set: <K extends Key>(k: K, v: SharedInputs[K]) => void;
  reset: (k: Key) => void;
}) {
  // Open on large screens, collapsed on phones (it is long)
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) setOpen(false);
  }, []);
  const { units } = useUnits();
  const km = kmPerYear(shared);
  const isChanged = (k: Key) => k in changed;

  const num = (k: Key, label: string, opts: Partial<Parameters<typeof NumberField>[0]> = {}, src?: Sourced<unknown>) => (
    <Field label={label} src={src}>
      <NumberField
        label={label}
        value={shared[k] as number}
        changed={isChanged(k)}
        onChange={(v) => set(k, v as never)}
        onReset={() => reset(k)}
        {...opts}
      />
    </Field>
  );

  return (
    <section aria-labelledby="your-driving" className="no-print border-b border-line bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 py-4 text-left"
        >
          <span>
            <span id="your-driving" className="text-lg font-semibold">
              Your driving
            </span>
            <span className="ml-3 text-sm text-muted">
              {distance(km, units)} a year · {Math.round(shared.cityShare * 100)}% city · {shared.years} years · {shared.winterMonths} winter months ·
              home charging {shared.homeCharging ? "yes" : "no"}
            </span>
          </span>
          <Chevron open={open} />
        </button>

        {open && (
          <div className="grid gap-x-10 gap-y-6 pb-8 md:grid-cols-2 xl:grid-cols-4">
            <Group title="How much you drive">
              <div className="flex gap-2 text-xs">
                {(["daily", "yearly"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={shared.kmMode === m}
                    onClick={() => set("kmMode", m)}
                    className={`rounded-full border px-3 py-1 ${shared.kmMode === m ? "border-fg bg-fg text-white" : "border-line text-muted"}`}
                  >
                    {m === "daily" ? "Per day" : "Per year"}
                  </button>
                ))}
              </div>
              {shared.kmMode === "daily" ? (
                <>
                  {units === "km"
                    ? num("kmPerDay", "Kilometres per driving day", { suffix: "km", min: 0, max: 1000 }, SOURCES.kmPerDay)
                    : (
                      <Field label="Miles per driving day" src={SOURCES.kmPerDay}>
                        <NumberField
                          label="Miles per driving day"
                          value={shared.kmPerDay / KM_PER_MI}
                          changed={isChanged("kmPerDay")}
                          onChange={(v) => set("kmPerDay", v * KM_PER_MI)}
                          onReset={() => reset("kmPerDay")}
                          suffix="mi"
                        />
                      </Field>
                    )}
                  {num("daysPerWeek", "Days driven per week", { min: 1, max: 7 }, SOURCES.daysPerWeek)}
                </>
              ) : (
                <Field label={units === "km" ? "Kilometres per year" : "Miles per year"}>
                  <NumberField
                    label="Distance per year"
                    value={units === "km" ? shared.kmPerYear : shared.kmPerYear / KM_PER_MI}
                    changed={isChanged("kmPerYear")}
                    onChange={(v) => set("kmPerYear", units === "km" ? v : v * KM_PER_MI)}
                    onReset={() => reset("kmPerYear")}
                    suffix={units}
                    step={1000}
                  />
                </Field>
              )}
              <Slider
                label={`City driving: ${Math.round(shared.cityShare * 100)}% (highway ${100 - Math.round(shared.cityShare * 100)}%)`}
                value={Math.round(shared.cityShare * 100)}
                min={0}
                max={100}
                step={5}
                onChange={(v) => set("cityShare", v / 100)}
                src={SOURCES.cityShare}
              />
              <Slider
                label={`Keep the car for ${shared.years} year${shared.years > 1 ? "s" : ""}`}
                value={shared.years}
                min={1}
                max={8}
                step={1}
                onChange={(v) => set("years", v)}
                src={SOURCES.years}
              />
              <Slider
                label={`Winter months per year: ${shared.winterMonths}`}
                value={shared.winterMonths}
                min={0}
                max={8}
                step={1}
                onChange={(v) => set("winterMonths", v)}
                src={SOURCES.winterMonths}
              />
            </Group>

            <Group title="Charging (electric and plug-in hybrid)">
              <Toggle checked={shared.homeCharging} onChange={(v) => set("homeCharging", v)} label="I can charge at home" />
              {shared.homeCharging && (
                <Slider
                  label={`Charging at home: ${Math.round(shared.homeChargeShare * 100)}% (public ${100 - Math.round(shared.homeChargeShare * 100)}%)`}
                  value={Math.round(shared.homeChargeShare * 100)}
                  min={0}
                  max={100}
                  step={5}
                  onChange={(v) => set("homeChargeShare", v / 100)}
                  src={SOURCES.homeChargeShare}
                />
              )}
              {num("electricityHome", "Home electricity, all-in", { prefix: "$", suffix: "/kWh", decimals: 3, min: 0 }, SOURCES.electricityHome)}
              {num("electricityPublic", "Public fast charging", { prefix: "$", suffix: "/kWh", decimals: 3, min: 0 }, SOURCES.electricityPublic)}
              {num("electricityIncrease", "Yearly electricity increase", { suffix: "%", percent: true, decimals: 1 }, SOURCES.electricityIncrease)}
            </Group>

            <Group title="Fuel prices (Alberta)">
              {num("gasRegular", "Regular gas", { prefix: "$", suffix: "/L", decimals: 3, min: 0 }, SOURCES.gasRegular)}
              {num("gasPremium", "Premium gas", { prefix: "$", suffix: "/L", decimals: 3, min: 0 }, SOURCES.gasPremium)}
              {num("diesel", "Diesel", { prefix: "$", suffix: "/L", decimals: 3, min: 0 }, SOURCES.diesel)}
              {num("fuelIncrease", "Yearly fuel price increase", { suffix: "%", percent: true, decimals: 1 }, SOURCES.fuelIncrease)}
            </Group>

            <Group title="Other costs">
              {num("parkingPerMonth", "Parking per month", { prefix: "$", min: 0 })}
              {num("registrationPerYear", "Registration per year", { prefix: "$", min: 0 }, SOURCES.registrationPerYear)}
              {num("evAnnualTax", "Alberta EV tax per year", { prefix: "$", min: 0 }, SOURCES.evAnnualTax)}
              {num("insuranceIncrease", "Yearly insurance increase", { suffix: "%", percent: true, decimals: 1 }, SOURCES.insuranceIncrease)}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted hover:text-fg">Winter effect on energy use</summary>
                <div className="mt-3 space-y-3">
                  {num("winterPenaltyGas", "Gas cars in winter", { prefix: "+", suffix: "%", percent: true }, SOURCES.winterPenaltyGas)}
                  {num("winterPenaltyHybrid", "Hybrids in winter", { prefix: "+", suffix: "%", percent: true }, SOURCES.winterPenaltyHybrid)}
                  {num("winterPenaltyEv", "Electric in winter", { prefix: "+", suffix: "%", percent: true }, SOURCES.winterPenaltyEv)}
                </div>
              </details>
            </Group>
          </div>
        )}
      </div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, src, children }: { label: string; src?: Sourced<unknown>; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="pt-1.5">
        {label}
        {src && <SourceTip src={src} />}
      </span>
      {children}
    </div>
  );
}

export function SourceTip({ src }: { src: Sourced<unknown> }) {
  return (
    <InfoTip>
      <span className="block font-semibold">{src.status === "sourced" ? "Source" : "Our estimate"}</span>
      <span className="block">{src.source}</span>
      {src.note && <span className="mt-1 block text-muted">{src.note}</span>}
      {src.url && (
        <a className="mt-1 block break-all text-accent underline" href={src.url} target="_blank" rel="noreferrer">
          {src.url}
        </a>
      )}
      <span className="mt-1 block text-muted">Checked {src.checked}</span>
    </InfoTip>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  src,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  src?: Sourced<unknown>;
}) {
  const id = label.replace(/\W+/g, "-");
  return (
    <div className="text-sm">
      <label htmlFor={id} className="block">
        {label}
        {src && <SourceTip src={src} />}
      </label>
      <input id={id} type="range" className="mt-2 w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
