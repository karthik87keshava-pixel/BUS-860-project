"use client";
// Cumulative cost by year, one line per column, each labelled at its right end. At the final year a bracket marks the gap
// between the cheapest and the most expensive option.
import { useEffect, useState } from "react";
import { CartesianGrid, LabelList, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/format";

// Brand teal first, then black, amber and purple; dashes tell lines apart without colour too.
const SERIES = [
  { color: "#0f766e", dash: undefined },
  { color: "#111111", dash: "6 3" },
  { color: "#b45309", dash: "2 3" },
  { color: "#6d28d9", dash: "10 4 2 4" },
];
const HEIGHT = 320;
const MARGIN = { top: 12, right: 112, left: 8, bottom: 8 };
const MARGIN_NARROW = { top: 12, right: 84, left: 0, bottom: 8 };
const MIN_LABEL_GAP = 15; // px between end labels

export function CostChart({ names, labels, cumulative }: { names: string[]; labels: string[]; cumulative: number[][] }) {
  // Phones: less room on the right for the end labels, smaller gap label
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const set = () => setNarrow(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  if (!names.length) return null;
  const margin = narrow ? MARGIN_NARROW : MARGIN;
  const years = Math.max(...cumulative.map((c) => c.length));
  const data = Array.from({ length: years }, (_, y) => {
    const row: Record<string, number | string> = { year: `Year ${y + 1}` };
    names.forEach((n, i) => (row[n] = Math.round(cumulative[i][y] ?? 0)));
    return row;
  });
  const finals = names.map((_, i) => Math.round(cumulative[i][years - 1] ?? 0));
  const top = Math.max(...cumulative.flat(), 1);
  const bottom = Math.min(0, ...cumulative.flat());
  const yMax = niceCeil(top);
  const yMin = bottom < 0 ? -niceCeil(-bottom) : 0;

  // Nudge end labels apart when lines finish close together (in pixels, then back to an offset per line)
  const plotH = HEIGHT - margin.top - margin.bottom - 30; // minus the x-axis
  const toPx = (v: number) => ((yMax - v) / (yMax - yMin)) * plotH;
  const order = finals.map((v, i) => ({ i, px: toPx(v) })).sort((a, b) => a.px - b.px);
  const placed: number[] = [];
  const dy: number[] = new Array(names.length).fill(0);
  order.forEach(({ i, px }, k) => {
    const y = k === 0 ? px : Math.max(px, placed[k - 1] + MIN_LABEL_GAP);
    placed.push(y);
    dy[i] = y - px;
  });

  const lo = Math.min(...finals);
  const hi = Math.max(...finals);
  const lastYear = `Year ${years}`;

  return (
    <section aria-labelledby="chart-title" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
      <h2 id="chart-title" className="text-xl font-semibold">
        Cumulative cost by year
      </h2>
      <p className="mt-1 text-sm text-muted">
        What each option would have cost you if you stopped at the end of that year: everything paid so far, plus any loan balance, minus
        what the car would sell for.
      </p>
      <div className="mt-6 w-full" style={{ height: HEIGHT }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={margin}>
            <CartesianGrid stroke="#e4e4e7" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="#71717a" />
            <YAxis domain={[yMin, yMax]} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 12 }} stroke="#71717a" width={narrow ? 44 : 56} />
            <Tooltip formatter={(v) => money(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {names.map((n, i) => (
              <Line
                key={n}
                type="monotone"
                dataKey={n}
                stroke={SERIES[i % 4].color}
                strokeDasharray={SERIES[i % 4].dash}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey={n}
                  content={(p: { x?: number | string; y?: number | string; index?: number }) =>
                    p.index === data.length - 1 ? (
                      <text x={Number(p.x) + 8} y={Number(p.y) + dy[i] + 4} fontSize={narrow ? 11 : 12} fontWeight={600} fill={SERIES[i % 4].color}>
                        {labels[i]}
                      </text>
                    ) : null
                  }
                />
              </Line>
            ))}
            {/* Drawn after the lines, so the gap label sits on top of them */}
            {names.length > 1 && hi - lo >= 1 && (
              <ReferenceLine
                segment={[
                  { x: lastYear, y: lo },
                  { x: lastYear, y: hi },
                ]}
                stroke="#0f766e"
                strokeWidth={2}
                ifOverflow="visible"
                label={(props: { viewBox?: { x?: number; y?: number; height?: number } }) => {
                  const vb = props.viewBox ?? {};
                  const w = narrow ? 56 : 66;
                  const h = vb.height ?? 0;
                  // Right of the bracket, between the two end labels, when there is room; otherwise to its left
                  const right = h >= 52;
                  const x = right ? (vb.x ?? 0) + 8 : (vb.x ?? 0) - 8 - w;
                  const y = (vb.y ?? 0) + h / 2;
                  return (
                    <g>
                      <rect x={x} y={y - 11} width={w} height={22} rx={4} fill="#ffffff" stroke="#0f766e" />
                      <text x={x + w / 2} y={y + 4} textAnchor="middle" fontSize={narrow ? 11 : 12} fontWeight={600} fill="#0f766e">
                        {money(hi - lo)}
                      </text>
                    </g>
                  );
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {names.length > 1 && hi - lo >= 1 && (
        <p className="mt-2 text-sm text-muted">
          The teal bracket at year {years} marks the {money(hi - lo)} gap between the cheapest and the most expensive option.
        </p>
      )}
      {/* Screen-reader copy of the chart. Wrapped, because a table ignores sr-only sizing and would widen the page on phones. */}
      <div className="sr-only">
        <table>
          <caption>Cumulative cost by year</caption>
          <thead>
            <tr>
              <th>Year</th>
              {names.map((n) => (
                <th key={n}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={String(r.year)}>
                <td>{r.year}</td>
                {names.map((n) => (
                  <td key={n}>{money(Number(r[n]))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Round an axis maximum up to a tidy number (e.g. 76,240 → 80,000). */
function niceCeil(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  for (const s of steps) if (s * p >= v * 1.02) return s * p;
  return 10 * p;
}
