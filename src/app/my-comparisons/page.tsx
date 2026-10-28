import type { Metadata } from "next";
import { MyComparisons } from "@/components/MyComparisons";

export const metadata: Metadata = { title: "My comparisons" };

export default function MyComparisonsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">My comparisons</h1>
      <MyComparisons />
    </div>
  );
}
