"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ComparisonState } from "@/lib/state";
import { supabase, supabaseConfigured, useSession, type SavedComparison } from "@/lib/supabase";

export function MyComparisons() {
  const { session, ready } = useSession();
  const [items, setItems] = useState<SavedComparison[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase()!.from("comparisons").select("id,name,state,created_at,updated_at").order("updated_at", { ascending: false });
    if (error) setError(error.message);
    setItems(data ?? []);
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (!supabaseConfigured) return <p className="mt-6 text-muted">Saving isn&rsquo;t switched on yet (Supabase keys missing).</p>;
  if (!ready) return <p className="mt-6 text-muted">Loading…</p>;
  if (!session)
    return (
      <p className="mt-6">
        <Link href="/sign-in?next=/my-comparisons" className="underline">
          Sign in
        </Link>{" "}
        to see your saved comparisons.
      </p>
    );

  const rename = async (c: SavedComparison) => {
    const name = window.prompt("New name:", c.name);
    if (!name) return;
    await supabase()!.from("comparisons").update({ name }).eq("id", c.id);
    load();
  };
  const duplicate = async (c: SavedComparison) => {
    await supabase()!.from("comparisons").insert({ name: `${c.name} (copy)`, state: c.state });
    load();
  };
  const remove = async (c: SavedComparison) => {
    if (!window.confirm(`Delete "${c.name}"? This can't be undone.`)) return;
    await supabase()!.from("comparisons").delete().eq("id", c.id);
    load();
  };

  return (
    <div className="mt-8">
      {error && (
        <p className="mb-4 text-sm text-warn" role="alert">
          {error}
        </p>
      )}
      {items === null ? (
        <p className="text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-muted">
          Nothing saved yet.{" "}
          <Link href="/compare" className="underline">
            Start a comparison
          </Link>{" "}
          and press Save.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {items.map((c) => {
            const st = c.state as ComparisonState;
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <Link href={`/compare?id=${c.id}`} className="font-semibold hover:text-accent">
                    {c.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {st?.columns?.length ?? 0} vehicle{st?.columns?.length === 1 ? "" : "s"} · updated {new Date(c.updated_at).toLocaleDateString("en-CA")}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <Link href={`/compare?id=${c.id}`} className="rounded-full bg-fg px-4 py-1.5 text-white">
                    Open
                  </Link>
                  <button type="button" onClick={() => rename(c)} className="rounded-full border border-line px-4 py-1.5 hover:border-fg">
                    Rename
                  </button>
                  <button type="button" onClick={() => duplicate(c)} className="rounded-full border border-line px-4 py-1.5 hover:border-fg">
                    Duplicate
                  </button>
                  <button type="button" onClick={() => remove(c)} className="rounded-full border border-line px-4 py-1.5 text-warn hover:border-warn">
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
