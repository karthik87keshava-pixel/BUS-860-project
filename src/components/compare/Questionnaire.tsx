"use client";
// A short questionnaire in plain words. Each answer fills an existing input ("Your driving"); every question can be skipped.
import { useEffect, useRef, useState } from "react";
import type { SharedInputs } from "@/lib/calc";
import { CHARGING, DISTANCE, REGIONS, TRAFFIC, type SharedPatch } from "@/lib/questionnaire";

type Step = "distance" | "traffic" | "years" | "region" | "charging";

export function Questionnaire({
  open,
  onClose,
  shared,
  changed,
  region,
  askCharging,
  apply,
}: {
  open: boolean;
  onClose: () => void;
  shared: SharedInputs;
  changed: Partial<SharedInputs>;
  region?: string;
  askCharging: boolean; // only when an electric or plug-in car is in the comparison
  apply: (patch: SharedPatch, region?: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const steps: Step[] = askCharging ? ["distance", "traffic", "years", "region", "charging"] : ["distance", "traffic", "years", "region"];
  const [i, setI] = useState(0);
  const [yearly, setYearly] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setI(0);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const step = steps[Math.min(i, steps.length - 1)];
  const next = () => (i + 1 >= steps.length ? onClose() : setI(i + 1));
  const choose = (patch: SharedPatch, r?: string) => {
    apply(patch, r);
    next();
  };
  const picked = (k: keyof SharedInputs) => k in changed;

  const Option = ({ label, hint, selected, onClick }: { label: string; hint?: string; selected: boolean; onClick: () => void }) => (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition hover:border-accent ${selected ? "border-accent bg-accent-soft" : "border-line bg-white"}`}
    >
      <span className="block font-medium">{label}</span>
      {hint && <span className="block text-sm text-muted">{hint}</span>}
    </button>
  );

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="q-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-0 text-fg shadow-xl backdrop:bg-black/40"
    >
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="whitespace-nowrap text-xs font-medium uppercase tracking-wider text-muted">
            Question {Math.min(i, steps.length - 1) + 1} of {steps.length}
          </p>
          <button type="button" onClick={onClose} className="text-sm text-accent underline underline-offset-2 hover:text-accent-strong">
            Skip, use averages
          </button>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden>
          {steps.map((s, k) => (
            <span key={s} className={`h-1 flex-1 rounded-full ${k <= i ? "bg-accent" : "bg-zinc-200"}`} />
          ))}
        </div>

        {step === "distance" && (
          <>
            <h2 id="q-title" className="mt-5 text-xl font-semibold">How far do you drive on a typical day?</h2>
            <div className="mt-4 grid gap-2">
              {DISTANCE.map((o) => (
                <Option
                  key={o.id}
                  label={o.label}
                  hint={o.hint}
                  selected={picked("kmPerDay") && shared.kmMode === "daily" && shared.kmPerDay === o.km}
                  onClick={() => choose({ kmMode: "daily", kmPerDay: o.km })}
                />
              ))}
            </div>
            <form
              className="mt-4 flex flex-wrap items-end gap-2 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(yearly.replace(/[,\s]/g, ""));
                if (Number.isFinite(n) && n > 0) choose({ kmMode: "yearly", kmPerYear: Math.min(n, 200000) });
              }}
            >
              <label className="flex-1">
                <span className="block text-muted">Or, if you know it: kilometres per year</span>
                <input
                  inputMode="numeric"
                  value={yearly}
                  onChange={(e) => setYearly(e.target.value)}
                  placeholder="e.g. 18,000"
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2"
                />
              </label>
              <button type="submit" className="rounded-full border border-accent px-4 py-2 font-medium text-accent hover:bg-accent-soft">
                Use this
              </button>
            </form>
          </>
        )}

        {step === "traffic" && (
          <>
            <h2 id="q-title" className="mt-5 text-xl font-semibold">When do you usually drive?</h2>
            <p className="mt-1 text-sm text-muted">Stop-and-go traffic uses more gas. Hybrids and electric cars lose much less.</p>
            <div className="mt-4 grid gap-2">
              {TRAFFIC.map((o) => (
                <Option key={o.id} label={o.label} hint={o.hint} selected={picked("cityShare") && shared.cityShare === o.cityShare} onClick={() => choose({ cityShare: o.cityShare })} />
              ))}
            </div>
          </>
        )}

        {step === "years" && (
          <>
            <h2 id="q-title" className="mt-5 text-xl font-semibold">How many years will you keep the car?</h2>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((y) => (
                <button
                  key={y}
                  type="button"
                  aria-pressed={picked("years") && shared.years === y}
                  onClick={() => choose({ years: y })}
                  className={`rounded-xl border px-2 py-3 text-center font-medium hover:border-accent ${picked("years") && shared.years === y ? "border-accent bg-accent-soft" : "border-line"}`}
                >
                  {y}
                  <span className="block text-xs font-normal text-muted">{y === 5 ? "typical" : y === 1 ? "year" : "years"}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "region" && (
          <>
            <h2 id="q-title" className="mt-5 text-xl font-semibold">Where in Alberta do you live?</h2>
            <p className="mt-1 text-sm text-muted">Longer winters mean more fuel and less electric range.</p>
            <div className="mt-4 grid gap-2">
              {REGIONS.map((o) => (
                <Option key={o.id} label={o.label} hint={`${o.hint} · about ${o.winterMonths} winter months`} selected={region === o.id} onClick={() => choose({ winterMonths: o.winterMonths }, o.id)} />
              ))}
            </div>
          </>
        )}

        {step === "charging" && (
          <>
            <h2 id="q-title" className="mt-5 text-xl font-semibold">Can you charge at home?</h2>
            <p className="mt-1 text-sm text-muted">Home electricity costs much less than public fast charging.</p>
            <div className="mt-4 grid gap-2">
              {CHARGING.map((o) => (
                <Option
                  key={o.id}
                  label={o.label}
                  hint={o.hint}
                  selected={picked("homeCharging") && shared.homeCharging === o.homeCharging && (!o.homeCharging || shared.homeChargeShare === o.homeChargeShare)}
                  onClick={() => choose(o.homeCharging ? { homeCharging: true, homeChargeShare: o.homeChargeShare } : { homeCharging: false })}
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-6 flex items-center justify-between text-sm">
          <button type="button" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="rounded-full border border-line px-4 py-2 hover:border-fg disabled:opacity-40">
            Back
          </button>
          <button type="button" onClick={next} className="rounded-full bg-accent px-5 py-2 font-medium text-white hover:bg-accent-strong">
            {i + 1 >= steps.length ? "Done" : "Keep this, next"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
