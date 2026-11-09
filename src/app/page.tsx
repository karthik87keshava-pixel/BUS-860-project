import Link from "next/link";
import { BodyOutline } from "@/components/compare/BodyOutline";
import { exampleCards, exampleHref } from "@/lib/example";
import { money } from "@/lib/format";
import { TAGLINE } from "@/lib/site";
import { DATA_INFO } from "@/lib/vehicles-server";

// The example card uses live photos; refresh the page once a day
export const revalidate = 86400;

export default async function Home() {
  const example = await exampleCards();
  const href = exampleHref();
  const [a, b] = example.cards;
  const gap = a && b ? Math.abs(a.netCost - b.netCost) : 0;
  const cheaper = a && b ? (a.netCost <= b.netCost ? a : b) : null;

  return (
    <div>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-14 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">Alberta car cost calculator</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">What will that car really cost you?</h1>
          <p className="mt-4 text-xl font-medium text-accent">{TAGLINE}</p>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Compare up to four cars side by side — loan, lease or cash — over the years you plan to keep them. We add up the price, GST,
            payments, fuel or electricity, insurance, maintenance, tires and registration, then take off what the car is worth at the end.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/compare" className="rounded-full bg-accent px-7 py-3.5 text-base font-medium text-white hover:bg-accent-strong">
              Start a comparison
            </Link>
            <Link href={href} className="rounded-full border border-accent px-7 py-3.5 text-base font-medium text-accent hover:bg-accent-soft">
              Try an example
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">
            No account needed.{" "}
            <Link href="/sign-in?next=/my-comparisons" className="text-accent underline underline-offset-2 hover:text-accent-strong">
              Sign in
            </Link>{" "}
            only if you want to save comparisons.
          </p>
        </div>

        {/* A static preview of a results card, using the example above */}
        {a && b && (
          <Link
            href={href}
            aria-label={`Example: ${a.name} versus ${b.name}. Open the full comparison.`}
            className="group block rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-accent hover:shadow-md"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-muted">Example · both on a loan · {example.years} years</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {[a, b].map((c) => (
                <div key={c.name}>
                  <div className="aspect-[16/10] overflow-hidden rounded-lg bg-soft">
                    {c.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.photo.url} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <BodyOutline body={c.body} className="h-full w-full p-3" />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-snug">{c.name}</p>
                  <p className="mt-2 text-xs text-muted">Net cost after resale</p>
                  <p className="text-2xl font-bold tracking-tight">{money(c.netCost)}</p>
                  <p className="text-xs text-muted">{money(c.perMonth)} a month</p>
                  {c.isLowest && <span className="mt-2 inline-block rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white">Lowest cost</span>}
                </div>
              ))}
            </div>
            {cheaper && gap >= 1 && (
              <p className="mt-4 border-t border-line pt-3 text-sm">
                The <span className="font-semibold">{cheaper.short}</span> saves {money(gap)} over {example.years} years.{" "}
                <span className="font-medium text-accent group-hover:underline">See how →</span>
              </p>
            )}
            {a.photo && b.photo && <p className="mt-2 text-[10px] text-muted">Photos: Wikimedia Commons ({a.photo.author}, {a.photo.license}; {b.photo.author}, {b.photo.license})</p>}
          </Link>
        )}
      </section>

      <section className="border-y border-line bg-soft">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
          <Feature title={`${DATA_INFO.count.toLocaleString("en-CA")} vehicle versions`}>
            Every gas, hybrid, plug-in hybrid, electric and diesel model rated by Natural Resources Canada (and the US EPA where NRCan hasn&rsquo;t
            yet) from {DATA_INFO.firstYear} to {DATA_INFO.lastYear}, each with a pre-filled price.
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

      <section className="mx-auto max-w-7xl px-4 pb-4 pt-14 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          <Step n={1} title="Pick up to four cars">
            Search (&ldquo;2024 civic hybrid&rdquo;) or choose year, make, model and version. Then pick loan, lease or cash.
          </Step>
          <Step n={2} title="Tell us how you drive">
            Kilometres, city or highway, how many winter months, whether you can charge at home, and how long you&rsquo;ll keep the car.
          </Step>
          <Step n={3} title="Compare like for like">
            A one-line answer, the net cost of each car after resale, cost per month and per km, and a year-by-year chart.
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
    <li className="border-t-2 border-accent pt-4">
      <span className="text-sm text-muted">Step {n}</span>
      <h3 className="mt-1 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-muted">{children}</p>
    </li>
  );
}
