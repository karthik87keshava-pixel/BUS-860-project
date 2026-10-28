# DriveTally (working name)

A website for comparing the full cost of getting and running up to 4 cars in Alberta — loan, lease or cash — over 1 to 8 years.
Built for the UAlberta EMBA course BUS 860 (Managing Intelligence). Claude Code writes and maintains the code; the team does not need to edit it.

## What's where

| Path | What it is |
|---|---|
| `docs/BUILD_PROMPT.md` | The team's original brief |
| `docs/PLAN.md` | The build plan and compare-page sketch |
| `docs/SETUP.md` | Step-by-step account setup (Supabase, Vercel, Google sign-in) |
| `DECISIONS.md` | Every assumption, data source and design choice, with dates (for the professor) |
| `docs/data-coverage.md` | How many vehicles were imported per year and fuel type, and every row we didn't use |
| `docs/price-coverage.md` | How many prices are verified vs estimated |
| `src/lib/calc/` | **All the maths**, in one place, with hand-worked tests (`calc.test.ts`) |
| `src/data/vehicles.json` | The vehicle list the site uses (generated — don't edit by hand) |
| `data/prices/family-prices.csv` | Base price estimate for every model family |
| `data/prices/verified-prices.csv` | Published prices with source links — add rows here to improve accuracy |
| `supabase/schema.sql` | Database setup for saved comparisons |

## Running it on a computer (optional)

You only need this to try changes before they go live. You need [Node.js 22](https://nodejs.org) installed.

1. Open a terminal in this folder.
2. Run `npm install` (first time only).
3. Copy `.env.example` to `.env.local` and paste in the two Supabase values (see `docs/SETUP.md`). Without them the site works but sign-in and saving are switched off.
4. Run `npm run dev` and open http://localhost:3000.

Checks: `npm test` runs the calculation tests; `npm run build` checks the whole site.

## Updating the data (once a year, or when NRCan publishes new ratings)

1. `npm run data:refresh` — downloads the latest NRCan ratings, the EPA file and the Statistics Canada price index, rebuilds the vehicle list and the prices, and rewrites the two coverage reports in `docs/`.
2. `npm run data:photos` — optional, fills in missing car photos (slow, about 30–60 minutes).
3. Update the dates in `src/lib/site.ts`, and check `src/lib/calc/defaults.ts` (fuel, electricity, insurance, rebates) against the sources listed there.
4. Commit and push. The site redeploys by itself.

**To add a confirmed price:** add a row to `data/prices/verified-prices.csv` (make, model family, year, price, source, link, date), then run `npm run data:prices`.

## Deploying (redeploying)

The live site is on Vercel and is connected to this GitHub repository. **Every push to GitHub redeploys the site automatically**, usually within two minutes. To redeploy without changes, open the project in Vercel → Deployments → ⋯ → Redeploy.

The two secret values (Supabase URL and anon key) live in Vercel → Project → Settings → Environment Variables, never in the code.

## Status

See the end of `DECISIONS.md` for the current status and what's left for December.
