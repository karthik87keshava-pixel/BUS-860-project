"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { calculateColumn, defaultShared, lowestCost, resolveColumn, type ColumnInputs, type Payment, type SharedInputs } from "@/lib/calc";
import { displayName, shortNames } from "@/lib/names";
import { decodeState, emptyState, encodeState, MAX_COLUMNS, type ComparisonState } from "@/lib/state";
import { summarySentence } from "@/lib/summary";
import { supabase, isSupabaseConfigured, useSession } from "@/lib/supabase";
import type { Photo, Vehicle } from "@/lib/vehicle-types";
import { AddVehicle } from "./AddVehicle";
import { CompareGrid, type Col } from "./CompareGrid";
import { Toggle } from "./controls";
import { CostChart } from "./CostChart";
import { SharedPanel } from "./SharedPanel";

type VehicleWithPhoto = Vehicle & { photo?: Photo | null };

const DRAFT_KEY = "fairdrive-draft";
const CURRENT_YEAR = 2026;

export function CompareTool() {
  const params = useSearchParams();
  const router = useRouter();
  const { session } = useSession();
  const [state, setState] = useState<ComparisonState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [vehicles, setVehicles] = useState<Record<string, VehicleWithPhoto>>({});
  const [adding, setAdding] = useState(false);
  const [differences, setDifferences] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedName, setSavedName] = useState("");
  const [message, setMessage] = useState("");

  // ---- load: share link (?s=), saved comparison (?id=), or this browser's last draft ----
  useEffect(() => {
    const fromUrl = decodeState(params.get("s"));
    const id = params.get("id");
    if (id && isSupabaseConfigured()) {
      // A saved comparison: the row tells us its name and that "Save" should update it.
      // If the URL also carries state (unsaved edits after a reload), that wins over the stored state.
      supabase()!
        .from("comparisons")
        .select("id,name,state")
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (data) {
            setSavedId(data.id);
            setSavedName(data.name);
            setState(fromUrl ?? decodeStateObject(data.state));
          } else {
            if (fromUrl) setState(fromUrl);
            else setMessage("Couldn't open that saved comparison. Are you signed in with the account that saved it?");
          }
          setLoaded(true);
        });
    } else if (fromUrl) {
      setState(fromUrl);
      setLoaded(true);
    } else {
      try {
        const draft = decodeState(localStorage.getItem(DRAFT_KEY));
        if (draft) setState(draft);
      } catch {
        // storage blocked
      }
      setLoaded(true);
    }
    // only on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- keep the URL (share link) and the local draft up to date ----
  useEffect(() => {
    if (!loaded) return;
    const encoded = encodeState(state);
    const url = new URL(window.location.href);
    url.searchParams.set("s", encoded);
    if (savedId) url.searchParams.set("id", savedId);
    else url.searchParams.delete("id");
    window.history.replaceState(null, "", url.toString());
    try {
      localStorage.setItem(DRAFT_KEY, encoded);
    } catch {
      // ignore
    }
  }, [state, loaded, savedId]);

  // ---- fetch vehicle facts (and photos) for any column we don't have yet ----
  const ids = state.columns.map((c) => c.vehicleId);
  useEffect(() => {
    const missing = [...new Set(ids)].filter((id) => !vehicles[id]);
    if (!missing.length) return;
    fetch(`/api/vehicles/batch?ids=${missing.join(",")}`)
      .then((r) => r.json())
      .then((d: { vehicles: (VehicleWithPhoto | null)[] }) =>
        setVehicles((old) => {
          const next = { ...old };
          d.vehicles.forEach((v) => v && (next[v.id] = v));
          return next;
        }),
      );
  }, [ids.join(","), vehicles]); // eslint-disable-line react-hooks/exhaustive-deps

  const shared: SharedInputs = useMemo(() => ({ ...defaultShared(CURRENT_YEAR), ...state.shared }), [state.shared]);

  const update = useCallback((fn: (s: ComparisonState) => ComparisonState) => setState((s) => fn(structuredClone(s))), []);

  const cols: Col[] = useMemo(
    () =>
      state.columns.flatMap((c, i) => {
        const v = vehicles[c.vehicleId];
        if (!v) return [];
        const inputs = resolveColumn(v, shared, c.payment, c.overrides);
        const result = calculateColumn(v, shared, inputs);
        return [
          {
            key: `${i}-${c.vehicleId}`,
            v,
            inputs,
            result,
            overrides: c.overrides,
            setOverride: <K extends keyof ColumnInputs>(k: K, val: ColumnInputs[K]) =>
              update((s) => {
                s.columns[i].overrides[k] = val;
                return s;
              }),
            resetOverride: (k: keyof ColumnInputs) =>
              update((s) => {
                delete s.columns[i].overrides[k];
                return s;
              }),
            setPayment: (p: Payment) =>
              update((s) => {
                s.columns[i].payment = p;
                return s;
              }),
            remove: () =>
              update((s) => {
                s.columns.splice(i, 1);
                return s;
              }),
          },
        ];
      }),
    [state.columns, vehicles, shared, update],
  );

  const lowest = lowestCost(cols.map((c) => c.result));
  const loading = state.columns.length > cols.length;

  const addVehicle = (vehicleId: string, payment: Payment) => {
    update((s) => {
      if (s.columns.length < MAX_COLUMNS) s.columns.push({ vehicleId, payment, overrides: {} });
      return s;
    });
    setAdding(false);
  };

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("id"); // a share link works for anyone, without signing in
    try {
      await navigator.clipboard.writeText(url.toString());
      setMessage("Share link copied. Anyone with the link can open this comparison.");
    } catch {
      window.prompt("Copy this link:", url.toString());
    }
  };

  const save = async () => {
    const sb = supabase();
    if (!sb) {
      setMessage("Saving isn't set up yet (Supabase keys missing).");
      return;
    }
    if (!session) {
      router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    const defaultName = cols.map((c) => displayName(c.v)).join(" vs ") || "My comparison";
    if (savedId) {
      const { error } = await sb.from("comparisons").update({ state, name: savedName || defaultName }).eq("id", savedId);
      setMessage(error ? `Couldn't save: ${error.message}` : "Saved.");
    } else {
      const name = window.prompt("Name this comparison:", defaultName);
      if (name === null) return;
      const { data, error } = await sb.from("comparisons").insert({ state, name: name || defaultName }).select("id,name").single();
      if (data) {
        setSavedId(data.id);
        setSavedName(data.name);
      }
      setMessage(error ? `Couldn't save: ${error.message}` : "Saved to My comparisons.");
    }
  };

  const setShared = <K extends keyof SharedInputs>(k: K, v: SharedInputs[K]) =>
    update((s) => {
      (s.shared as Record<string, unknown>)[k] = v;
      return s;
    });
  const resetShared = (k: keyof SharedInputs) =>
    update((s) => {
      delete s.shared[k];
      return s;
    });

  const short = shortNames(cols.map((c) => ({ v: c.v, payment: c.inputs.payment })));
  const names = cols.map((c, i) => `${i + 1}. ${c.v.year} ${short[i]} (${c.inputs.payment})`);
  const summary = summarySentence(
    cols.map((c, i) => ({ fullName: displayName(c.v), shortName: short[i], result: c.result })),
    shared.years,
    lowest?.basis ?? "net",
  );

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{savedName || "Compare"}</h1>
            <p className="mt-1 text-sm text-muted">
              Alberta, {shared.years}-year cost. Pre-filled numbers are estimates — click any number to change it.
            </p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2 text-sm">
            <button type="button" onClick={copyLink} disabled={!cols.length} className="rounded-full border border-line px-4 py-2 hover:border-fg disabled:opacity-40">
              Share link
            </button>
            <button type="button" onClick={() => window.print()} disabled={!cols.length} className="rounded-full border border-line px-4 py-2 hover:border-fg disabled:opacity-40">
              Print / PDF
            </button>
            <button type="button" onClick={save} disabled={!cols.length} className="rounded-full bg-accent px-5 py-2 font-medium text-white hover:bg-accent-strong disabled:opacity-40">
              {session ? (savedId ? "Save changes" : "Save") : "Sign in to save"}
            </button>
          </div>
        </div>
        {/* Printed copies say what the numbers are based on */}
        <div className="hidden text-xs leading-relaxed print:block">
          <p suppressHydrationWarning>
            Printed {new Date().toLocaleDateString("en-CA")} from Fairdrive — {typeof window !== "undefined" ? window.location.host : ""}. Estimates only, not
            financial advice.
          </p>
          <p>
            Your driving: {Math.round(shared.kmMode === "yearly" ? shared.kmPerYear : shared.kmPerDay * shared.daysPerWeek * 52).toLocaleString("en-CA")} km a
            year, {Math.round(shared.cityShare * 100)}% city, {shared.years} years, {shared.winterMonths} winter months, home charging{" "}
            {shared.homeCharging ? `yes (${Math.round(shared.homeChargeShare * 100)}% at home)` : "no"}. Gas ${shared.gasRegular.toFixed(2)}/L regular, $
            {shared.gasPremium.toFixed(2)}/L premium; electricity ${shared.electricityHome.toFixed(3)}/kWh home, ${shared.electricityPublic.toFixed(2)}/kWh
            public; parking ${shared.parkingPerMonth}/month. Cash purchase price {shared.includeCashPrice ? "included" : "not included"}.
          </p>
        </div>
        <p role="status" aria-live="polite" className="no-print mt-2 min-h-5 text-sm text-accent">
          {message}
        </p>
      </div>

      <SharedPanel shared={shared} changed={state.shared} set={setShared} reset={resetShared} />

      <div className="no-print mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4 sm:px-6">
        <Toggle checked={differences} onChange={setDifferences} label="Show differences only" />
        <Toggle checked={shared.includeCashPrice} onChange={(v) => setShared("includeCashPrice", v)} label="Include purchase price for cash" />
        {loading && <span className="text-sm text-muted">Loading vehicles…</span>}
      </div>

      {/* Plain-English summary, based on net cost after resale (the same number the "Lowest cost" badge uses) */}
      {summary && (
        <div className="mx-auto max-w-7xl px-4 pb-2 sm:px-6">
          <p aria-live="polite" className="border-l-4 border-accent pl-4 text-lg font-medium leading-snug sm:text-xl">
            {summary}
          </p>
        </div>
      )}

      <CompareGrid cols={cols} shared={shared} lowest={lowest} onAdd={() => setAdding(true)} showDifferences={differences} />

      {cols.length > 0 && <CostChart names={names} labels={short} cumulative={cols.map((c) => c.result.cumulative)} />}

      <p className="mx-auto max-w-7xl px-4 pt-8 text-xs text-muted sm:px-6">
        How every number is worked out: <Link href="/how-we-calculate" className="text-accent underline underline-offset-2">How we calculate</Link>.
      </p>

      <AddVehicle open={adding} onClose={() => setAdding(false)} onAdd={addVehicle} />
    </div>
  );
}

function decodeStateObject(s: unknown): ComparisonState {
  const st = s as ComparisonState;
  return st && st.v === 1 && Array.isArray(st.columns) ? { v: 1, shared: st.shared ?? {}, columns: st.columns.slice(0, MAX_COLUMNS) } : emptyState();
}
