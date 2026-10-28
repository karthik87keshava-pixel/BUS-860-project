"use client";
// Cumulative cost by year, one line per column.
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/format";

// Black, accent teal, and two neutral-but-distinct tones; dashes tell lines apart without colour too.
const SERIES = [
  { color: "#111111", dash: undefined },
  { color: "#0f766e", dash: "6 3" },
  { color: "#b45309", dash: "2 3" },
  { color: "#6d28d9", dash: "10 4 2 4" },
];

export function CostChart({ names, cumulative }: { names: string[]; cumulative: number[][] }) {
  if (!names.length) return null;
  const years = Math.max(...cumulative.map((c) => c.length));
  const data = Array.from({ length: years + 1 }, (_, y) => {
    const row: Record<string, number | string> = { year: y === 0 ? "Start" : `Year ${y}` };
    names.forEach((n, i) => {
      if (y > 0) row[n] = Math.round(cumulative[i][y - 1] ?? 0);
    });
    return row;
  });
  return (
    <section aria-labelledby="chart-title" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
      <h2 id="chart-title" className="text-xl font-semibold">
        Cumulative cost by year
      </h2>
      <p className="mt-1 text-sm text-muted">
        What each option would have cost you if you stopped at the end of that year: everything paid so far, plus any loan balance, minus
        what the car would sell for.
      </p>
      <div className="mt-6 h-80 w-full">
        <ResponsiveContainer>
          <LineChart data={data.slice(1)} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="#e4e4e7" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="#71717a" />
            <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 12 }} stroke="#71717a" width={56} />
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
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
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
          {data.slice(1).map((r) => (
            <tr key={String(r.year)}>
              <td>{r.year}</td>
              {names.map((n) => (
                <td key={n}>{money(Number(r[n]))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
