// The one-line, plain-English summary above the results. It only reads results the calculation module already
// produced (net cost, running costs, interest, resale); it does not calculate anything new.
import type { ColumnResult } from "./calc";
import { money } from "./format";

export interface SummaryCar {
  fullName: string; // "2025 Toyota RAV4 Hybrid AWD"
  shortName: string; // "Toyota RAV4"
  result: ColumnResult;
}

/** What makes up a car's net cost, apart from running costs. Display grouping only. */
function parts(r: ColumnResult) {
  const interest = r.interestPaid;
  const resale = r.resaleValue;
  const buying = r.ownershipCost - interest; // price, fees, GST, rebate (or lease payments)
  return { interest, resale, buying };
}

function joinWords(words: string[]) {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

export function summarySentence(cars: SummaryCar[], years: number, basis: "net" | "running"): string {
  if (!cars.length) return "";
  const period = `${years} year${years > 1 ? "s" : ""}`;
  if (cars.length === 1) {
    const c = cars[0];
    return c.result.priceExcluded
      ? `Over ${period}, the ${c.fullName} costs ${money(c.result.netCost)} to run, or ${money(c.result.perMonth)} a month (purchase price not included).`
      : `Over ${period}, the ${c.fullName} costs ${money(c.result.netCost)} after resale, or ${money(c.result.perMonth)} a month.`;
  }

  const value = (c: SummaryCar) => (basis === "net" ? c.result.netCost : c.result.runningCost);
  const ranked = [...cars].sort((a, b) => value(a) - value(b));
  const [best, next] = ranked;
  const saving = value(next) - value(best);

  if (basis === "running") {
    return `A cash purchase price is left out, so this compares running costs only: the ${best.fullName} costs ${money(saving)} less to run over ${period} than the ${next.shortName}.`;
  }

  let text =
    saving < 1
      ? `The ${best.fullName} and the ${next.shortName} cost about the same over ${period}.`
      : `The ${best.fullName} saves you ${money(saving)} over ${period} compared with the ${next.shortName}.`;

  // Is another car cheaper to run but dearer overall? Explain why, using the biggest differences.
  const rival = ranked
    .slice(1)
    .filter((c) => c.result.runningCost < best.result.runningCost)
    .sort((a, b) => a.result.runningCost - b.result.runningCost)[0];
  if (rival) {
    const runGap = best.result.runningCost - rival.result.runningCost;
    const p = parts(rival.result);
    const q = parts(best.result);
    const reasons = [
      { word: rival.result.payment === "lease" ? "lease payments" : "higher price", gap: p.buying - q.buying },
      { word: "interest", gap: p.interest - q.interest },
      { word: "lower resale value", gap: q.resale - p.resale },
    ]
      .filter((r) => r.gap > 0)
      .sort((a, b) => b.gap - a.gap);
    // Name the biggest reason, plus a second one if it is also large (at least half the running-cost gap)
    const named = reasons.filter((r, i) => i === 0 || (i === 1 && r.gap >= runGap / 2)).map((r) => r.word);
    if (named.length) {
      const plural = named.length > 1 || named[0] === "lease payments";
      text += ` The ${rival.shortName} is ${money(runGap)} cheaper to run, but its ${joinWords(named)} cancel${plural ? "" : "s"} that out.`;
    }
  }
  return text;
}
