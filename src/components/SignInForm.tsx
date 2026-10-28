"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, supabaseConfigured, useSession } from "@/lib/supabase";

export function SignInForm() {
  const params = useSearchParams();
  const router = useRouter();
  const next = safeNext(params.get("next"));
  const { session, ready } = useSession();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && session) router.replace(next);
  }, [ready, session, next, router]);

  if (!supabaseConfigured) {
    return (
      <p className="mt-8 rounded-lg border border-line bg-soft p-4 text-sm">
        Sign-in isn&rsquo;t switched on yet. The site owner needs to add the Supabase keys (see README). You can still build and share comparisons.
      </p>
    );
  }

  const redirectTo = () => `${window.location.origin}/sign-in?next=${encodeURIComponent(next)}`;

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase()!.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else setStatus("sent");
  };

  const google = async () => {
    const { error } = await supabase()!.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (error) {
      setError(error.message);
      setStatus("error");
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <button type="button" onClick={google} className="flex w-full items-center justify-center gap-3 rounded-full border border-fg px-6 py-3 font-medium hover:bg-soft">
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
        </svg>
        Continue with Google
      </button>
      <p className="text-center text-xs uppercase tracking-widest text-muted">or</p>
      {status === "sent" ? (
        <p className="rounded-lg bg-accent-soft p-4 text-sm" role="status">
          Check your email. We sent a sign-in link to <strong>{email}</strong>. Open it on this device.
        </p>
      ) : (
        <form onSubmit={sendLink} className="space-y-3">
          <label htmlFor="email" className="block text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line px-4 py-3 outline-none focus:border-accent"
          />
          <button type="submit" disabled={status === "sending"} className="w-full rounded-full bg-fg px-6 py-3 font-medium text-white hover:bg-accent disabled:opacity-50">
            {status === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      )}
      {status === "error" && (
        <p className="text-sm text-warn" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Only allow redirects back into this site. */
function safeNext(n: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/my-comparisons";
}
