"use client";
// Home page: type a car to start a comparison with the search already filled in.
import { useRouter } from "next/navigation";
import { useState } from "react";

export function HomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className="mt-8 flex max-w-xl flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/compare?q=${encodeURIComponent(q.trim())}` : "/compare");
      }}
    >
      <label className="min-w-0 flex-1 basis-60">
        <span className="sr-only">Type a car to compare</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a car, e.g. 2024 civic hybrid"
          className="w-full rounded-full border border-zinc-400 bg-white px-5 py-3.5 text-base outline-none focus:border-accent"
        />
      </label>
      <button type="submit" className="rounded-full bg-accent px-7 py-3.5 text-base font-medium text-white hover:bg-accent-strong">
        Start a comparison
      </button>
    </form>
  );
}
