import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareTool } from "@/components/compare/CompareTool";

export const metadata: Metadata = { title: "Compare" };

export default function ComparePage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-7xl px-6 py-16 text-muted">Loading…</p>}>
      <CompareTool />
    </Suspense>
  );
}
