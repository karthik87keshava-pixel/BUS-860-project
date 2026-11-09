"use client";
// Supabase connection for sign-in and saved comparisons.
// The two values come from environment variables (set in Vercel and in .env.local), never from the code.
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

// The Supabase URL and publishable key are public by design (row-level security protects the data).
// They are read on the server (SUPABASE_URL, SUPABASE_PUBLISHABLE) and handed to the browser by <SupabaseConfig>
// in the root layout, because Vercel refuses to store this value under a NEXT_PUBLIC_ name.
let config = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};
let client: SupabaseClient | null = null;

export function setSupabaseConfig(url?: string, key?: string) {
  if (url && key && (url !== config.url || key !== config.key)) {
    config = { url, key };
    client = null;
  }
}

export const isSupabaseConfigured = () => Boolean(config.url && config.key);

export function supabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) client = createClient(config.url, config.key, { auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true } });
  return client;
}

/** Placed once in the root layout: passes the server's Supabase settings to the browser code. */
export function SupabaseConfig({ url, publishableKey, children }: { url?: string; publishableKey?: string; children: React.ReactNode }) {
  setSupabaseConfig(url, publishableKey);
  return children;
}

/** Current sign-in session (null when signed out); `ready` turns true once we know. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured());
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready };
}

export interface SavedComparison {
  id: string;
  name: string;
  state: unknown;
  created_at: string;
  updated_at: string;
}
