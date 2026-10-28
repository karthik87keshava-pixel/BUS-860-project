"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase, supabaseConfigured, useSession } from "@/lib/supabase";

const NAV = [
  { href: "/compare", label: "Compare" },
  { href: "/how-we-calculate", label: "How we calculate" },
  { href: "/my-comparisons", label: "My comparisons" },
];

export function SiteHeader() {
  const path = usePathname();
  const { session } = useSession();
  return (
    <header className="no-print border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Drive<span className="text-accent">Tally</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-5 text-sm md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`hover:text-accent ${path?.startsWith(n.href) ? "font-semibold text-fg" : "text-muted"}`}
              aria-current={path?.startsWith(n.href) ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {session ? (
            <>
              <span className="hidden max-w-48 truncate text-muted sm:inline" title={session.user.email}>
                {session.user.email}
              </span>
              <button type="button" className="rounded-full border border-line px-4 py-1.5 hover:border-fg" onClick={() => supabase()?.auth.signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <Link
              href={`/sign-in?next=${encodeURIComponent(path ?? "/")}`}
              className="rounded-full border border-fg px-4 py-1.5 hover:bg-fg hover:text-white"
              title={supabaseConfigured ? undefined : "Sign-in is not set up yet"}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      <nav aria-label="Main (mobile)" className="flex gap-5 overflow-x-auto border-t border-line px-4 py-2 text-sm md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`whitespace-nowrap ${path?.startsWith(n.href) ? "font-semibold" : "text-muted"}`}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
