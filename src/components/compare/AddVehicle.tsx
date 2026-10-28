"use client";
// "Add vehicle" dialog: type-ahead search, or Year → Make → Model → Version, then Loan / Lease / Cash.
import { useEffect, useRef, useState } from "react";
import type { Payment } from "@/lib/calc";
import { money } from "@/lib/format";

interface Hit {
  id: string;
  year: number;
  make: string;
  family: string;
  model: string;
  version: string;
  fuelType: string;
  msrp: number;
}

const FUEL_LABEL: Record<string, string> = { gas: "Gas", hybrid: "Hybrid", phev: "Plug-in hybrid", ev: "Electric", diesel: "Diesel" };

export function AddVehicle({
  open,
  onClose,
  onAdd,
  initialPayment = "loan",
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (vehicleId: string, payment: Payment) => void;
  initialPayment?: Payment;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [showOld, setShowOld] = useState(false);
  const [year, setYear] = useState<number | "">("");
  const [makes, setMakes] = useState<string[]>([]);
  const [make, setMake] = useState("");
  const [families, setFamilies] = useState<string[]>([]);
  const [family, setFamily] = useState("");
  const [versions, setVersions] = useState<Hit[]>([]);
  const [picked, setPicked] = useState<Hit | null>(null);
  const [payment, setPayment] = useState<Payment>(initialPayment);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open || years.length) return;
    fetch("/api/vehicles/options").then((r) => r.json()).then((d) => setYears(d.years ?? []));
  }, [open, years.length]);

  // Type-ahead search (waits 200 ms after typing stops)
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/vehicles/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setHits(d.results ?? []))
        .finally(() => setSearching(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const chooseYear = (y: number | "") => {
    setYear(y);
    setMake("");
    setFamily("");
    setMakes([]);
    setFamilies([]);
    setVersions([]);
    setPicked(null);
    if (y) fetch(`/api/vehicles/options?year=${y}`).then((r) => r.json()).then((d) => setMakes(d.makes ?? []));
  };
  const chooseMake = (m: string) => {
    setMake(m);
    setFamily("");
    setFamilies([]);
    setVersions([]);
    setPicked(null);
    if (m) fetch(`/api/vehicles/options?year=${year}&make=${encodeURIComponent(m)}`).then((r) => r.json()).then((d) => setFamilies(d.families ?? []));
  };
  const chooseFamily = (f: string) => {
    setFamily(f);
    setVersions([]);
    setPicked(null);
    if (f)
      fetch(`/api/vehicles/options?year=${year}&make=${encodeURIComponent(make)}&family=${encodeURIComponent(f)}`)
        .then((r) => r.json())
        .then((d) => {
          setVersions(d.versions ?? []);
          if (d.versions?.length === 1) setPicked(d.versions[0]);
        });
  };

  const close = () => {
    onClose();
  };
  const add = () => {
    if (!picked) return;
    onAdd(picked.id, payment);
    setQ("");
    setHits([]);
    setPicked(null);
  };

  const shownYears = showOld ? years : years.filter((y) => y >= 2015);

  return (
    <dialog
      ref={ref}
      onClose={close}
      onCancel={close}
      aria-labelledby="add-vehicle-title"
      className="m-auto w-[min(720px,calc(100vw-2rem))] max-h-[90vh] rounded-2xl p-0 backdrop:bg-black/40"
    >
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="add-vehicle-title" className="text-xl font-semibold">
            Add a vehicle
          </h2>
          <button type="button" onClick={close} aria-label="Close" className="rounded-full p-2 text-2xl leading-none hover:bg-soft">
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <label htmlFor="vehicle-search" className="text-sm font-semibold">
            Search
          </label>
          <input
            id="vehicle-search"
            autoFocus
            type="search"
            placeholder='Try "2024 civic hybrid", "2026 f-150" or "model y"'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line px-4 py-3 text-base outline-none focus:border-accent"
          />
          {q.trim().length >= 2 && (
            <ul className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-line" aria-live="polite">
              {searching && hits.length === 0 && <li className="px-4 py-3 text-sm text-muted">Searching…</li>}
              {!searching && hits.length === 0 && <li className="px-4 py-3 text-sm text-muted">No matches. Try fewer words.</li>}
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(h)}
                    className={`flex w-full items-baseline justify-between gap-3 border-b border-line px-4 py-2.5 text-left text-sm last:border-0 hover:bg-soft ${picked?.id === h.id ? "bg-accent-soft" : ""}`}
                  >
                    <span>
                      <span className="font-medium">
                        {h.year} {h.make} {h.model}
                      </span>
                      <span className="block text-xs text-muted">{h.version.split(" · ").slice(1).join(" · ")}</span>
                    </span>
                    <span className="whitespace-nowrap text-xs text-muted">
                      {FUEL_LABEL[h.fuelType]} · {money(h.msrp)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="my-5 text-center text-xs uppercase tracking-widest text-muted">or choose step by step</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="1. Year" value={year} onChange={(v) => (v === "__old" ? setShowOld(true) : chooseYear(v ? Number(v) : ""))}>
              <option value="">Choose a year</option>
              {shownYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
              {!showOld && <option value="__old">Show 2010–2014…</option>}
            </Select>
            <Select label="2. Make" value={make} onChange={chooseMake} disabled={!makes.length}>
              <option value="">Choose a make</option>
              {makes.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
            <Select label="3. Model" value={family} onChange={chooseFamily} disabled={!families.length}>
              <option value="">Choose a model</option>
              {families.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
            <Select
              label="4. Version"
              value={picked && versions.some((v) => v.id === picked.id) ? picked.id : ""}
              onChange={(id) => setPicked(versions.find((v) => v.id === id) ?? null)}
              disabled={!versions.length}
            >
              <option value="">Choose a version</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version} — {money(v.msrp)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="border-t border-line bg-soft px-6 py-4">
          {picked ? (
            <p className="mb-3 text-sm">
              <span className="font-semibold">
                {picked.year} {picked.make} {picked.model}
              </span>
              <span className="block text-xs text-muted">{picked.version}</span>
            </p>
          ) : (
            <p className="mb-3 text-sm text-muted">Pick a vehicle above.</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <fieldset className="flex gap-2" aria-label="Payment option">
              {(["loan", "lease", "cash"] as const).map((p) => (
                <label
                  key={p}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm capitalize ${payment === p ? "border-fg bg-fg text-white" : "border-line bg-white"}`}
                >
                  <input type="radio" name="payment" value={p} checked={payment === p} onChange={() => setPayment(p)} className="sr-only" />
                  {p}
                </label>
              ))}
            </fieldset>
            <button
              type="button"
              disabled={!picked}
              onClick={add}
              className="rounded-full bg-fg px-6 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add to comparison
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function Select({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const id = label.replace(/\W+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm disabled:opacity-40"
      >
        {children}
      </select>
    </div>
  );
}
