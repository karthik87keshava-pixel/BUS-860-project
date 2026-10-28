import Link from "next/link";
import { DATA_INFO } from "@/lib/vehicles-server";

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">Alberta car cost calculator</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">What will that car really cost you?</h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          Compare up to four cars side by side — loan, lease or cash — over the years you plan to keep them. We add up the price, GST,
          payments, fuel or electricity, insurance, maintenance, tires and registration, then take off what the car is worth at the end.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/compare" className="rounded-full bg-fg px-7 py-3.5 text-base font-medium text-white hover:bg-accent">
            Start a comparison
          </Link>
          <Link href="/sign-in?next=/my-comparisons" className="rounded-full border border-fg px-7 py-3.5 text-base font-medium hover:bg-soft">
            Sign in to see saved comparisons
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">No account needed to compare. Sign in only if you want to save.</p>
      </section>

      <section className="border-y border-line bg-soft">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
          <Feature title={`${DATA_INFO.count.toLocaleString("en-CA")} vehicle versions`}>
            Every gas, hybrid, plug-in hybrid, electric and diesel model rated by Natural Resources Canada from {DATA_INFO.firstYear} to{" "}
            {DATA_INFO.lastYear}, each with a pre-filled price.
          </Feature>
          <Feature title="Built for Alberta">
            5% GST and no PST, Alberta fuel and electricity prices, registration and the $200 EV tax, Alberta insurance averages, and the
            current federal EV rebate.
          </Feature>
          <Feature title="Every number is yours to change">
            Each default shows where it came from. Change any figure, and reset it with one click. Share the result with a link.
          </Feature>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          <Step n={1} title="Pick up to four cars">
            Search (&ldquo;2024 civic hybrid&rdquo;) or choose year, make, model and version. Then pick loan, lease or cash.
          </Step>
          <Step n={2} title="Tell us how you drive">
            Kilometres, city or highway, how many winter months, whether you can charge at home, and how long you&rsquo;ll keep the car.
          </Step>
          <Step n={3} title="Compare like for like">
            Totals, cost per month and per km, running costs only, and a year-by-year chart. The cheapest column gets a badge.
          </Step>
        </ol>
      </section>
    </div>
  );
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-muted">{children}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="border-t border-fg pt-4">
      <span className="text-sm text-muted">Step {n}</span>
      <h3 className="mt-1 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-muted">{children}</p>
    </li>
  );
}
