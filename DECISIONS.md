# Decisions log

Every assumption, data source and design choice, with the date. Sources for each default value are also on the site's "How we calculate" page (`src/lib/calc/defaults.ts`).

## Process and scope

- **2026-10-28** — Project started. Brief saved as `docs/BUILD_PROMPT.md`; plan in `docs/PLAN.md`.
- **2026-10-28** — Team approved the plan. Team decisions on approval: **free data sources only** (no paid price service); **model years 2010 and later** are enough; **every vehicle must have a pre-filled price** (no empty price box).
- **2026-10-28** — Stack: Next.js 15 + TypeScript + Tailwind CSS on Vercel, Supabase for sign-in and saved comparisons, GitHub for code. Recharts for the chart, Vitest for tests, Playwright for browser checks, Inter font (self-hosted, free licence).

## Vehicle data

- **2026-10-28** — Source: NRCan Fuel Consumption Ratings, all six English tables (conventional 1995–2014, 2015–2024, 2025, 2026; battery-electric 2012–2026; plug-in hybrid 2012–2026), downloaded through the open.canada.ca CKAN data API (`datastore_search`) because the direct file links redirect to a storage host that was blocked in our build environment. Same data either way.
- **2026-10-28** — Result: **17,569 vehicle versions, 2010–2026, 56 makes, 667 model families** (see `docs/data-coverage.md` for counts per year and fuel type).
- **2026-10-28** — Rows not used (820, listed in the coverage report): 815 E85 ratings of flex-fuel vehicles (their gasoline rating is kept, since Alberta drivers buy gasoline), 1 natural-gas vehicle (not sold to the public), 4 exact duplicates.
- **2026-10-28** — NRCan does not flag hybrids in the conventional tables. A vehicle is marked hybrid when its name says so (Hybrid, Prius, Lexus "h" models, etc.) or when the EPA lists the exact same model as a hybrid. 46 vehicles were changed this way and are listed in `docs/data-coverage.md`. Mild hybrids (MHEV, Buick eAssist) stay "gas". Model years sold only as hybrids in Canada (2026 RAV4, Camry 2025+, Sienna 2021+, Venza 2021+, Crown, Crown Signia, Sequoia 2023+, Land Cruiser 2024+) are marked hybrid for every version.
- **2026-10-28** — EPA (fueleconomy.gov) data is also used to tell small from large SUVs for 2010–2014 (NRCan uses one "SUV" class those years) and to fill drive type. All consumption figures stay NRCan's.
- **2026-10-28** — Plug-in hybrids: NRCan gives only a combined electric rating, used for both city and highway. Some PHEVs still burn a little gas on battery ("[20.0 kWh + 0.2 L]/100 km"); that gas is counted.
- **2026-10-28** — "Model family" names (RAV4, F-150, 3 Series…) are built from NRCan names with rules per make, so the Model picker is tidy. Each NRCan row is a "version" (name + engine + transmission + rating).
- **2026-10-28** — Vehicle data is stored as a JSON file inside the site and searched on the server, **not in the Supabase database** as the brief suggested. Reasons: search is instant without a database round trip, the site works even if Supabase is paused (free projects pause after 7 days idle), and a yearly refresh is just "run the script, push". Supabase stores only accounts and saved comparisons. Easy to move later if needed.
- **2026-10-28** — Each vehicle has a stable ID built from its NRCan details, so saved comparisons and share links keep working after a data refresh.

## Prices

- **2026-10-28** — No free, complete Canadian MSRP database exists (the federal iZEV data has sales counts, not prices). Method, in order:
  1. A base Canadian MSRP for every model family (`data/prices/family-prices.csv`, 668 families) — our estimate from typical Canadian launch prices, marked **estimate**.
  2. Published 2026 base prices found in free public sources (Toyota Canada and Mazda Canada press releases, Auto123, CarCostCanada, Autotrader.ca research pages, Drive Tesla Canada, ThinkEV) in `data/prices/verified-prices.csv`, with link and date, marked **verified** — 35 rows covering 31 best-selling models. Where sources disagreed or only gave US prices (Ram 1500, Silverado, Escape, Maverick, Sorento, Grand Cherokee, Tiguan, Jetta), we kept the estimate.
  3. Version adjustments (AWD +7%, bigger engine +12% per two cylinders, trim keywords +10% / +22% / +50% / +90%, fuel-type premiums when no fuel-specific price exists; cap 2.5×). A price is "verified" only when the shown number is exactly the published base price.
- **2026-10-28** — Result: every one of the 17,569 versions has a pre-filled price; 47 are verified exact base prices. Expect estimates to be off by 10–20% for a given trim. Spot check: 2026 Model Y Long Range AWD estimated at $53,500 vs about $60,000 actual.
- **2026-10-28** — Older model years are moved to their own year with Statistics Canada's CPI for new passenger vehicles (table 18-10-0005-01). **Not loaded yet**: www150.statcan.gc.ca is blocked in our build environment, so older years currently use the newer base price. The used-price step (below) shrinks the effect.
- **2026-10-28** — **Older model years are priced as used cars.** A 2015 car can only be bought used, so pre-filling its 2015 sticker price would mislead. Default condition is "new" only for the newest model year of each family (2025 or later); older years get "used", with price = original MSRP × share of value kept at its age. Users can switch new/used. Leases are always new.
- **2026-10-28** — Paid options (not used, per team decision): Canadian Black Book licenses data only to qualified companies through its sales team, with no public price list; used-car values are also available from VMR. Licensed car photo services (IMAGIN.studio, EVOX/FuelAPI, used by JATO) also price by quote. Both would need a sales conversation before a public launch.

## Photos

- **2026-10-28** — Lead image of the "<Make> <Model>" Wikipedia article, used only if its Commons licence is Creative Commons or public domain; photographer and licence shown under the photo with links. One photo per model family (not per year/trim) for the November version. No free photo → a drawn body-type outline (sedan, SUV, truck, hatchback, van, wagon, coupe, convertible).
- **2026-10-28** — Wikimedia rate-limits (HTTP 429) our build environment's shared internet address, so photos could not be pre-fetched yet. The live site looks them up itself on Vercel and caches each for 30 days. `npm run data:photos` pre-fetches all families and writes `docs/photo-coverage.md` (the list of gaps) when run from an unblocked computer.

## Alberta defaults (all editable; sources on "How we calculate")

- **2026-10-28** — Regular gas $1.55/L (Edmonton/Calgary Sept 2026 averages 151–156¢; Alberta suspended its 13¢ fuel tax on Oct 1, 2026). Premium $1.80, diesel $1.65 (estimates). Fuel +2%/year.
- **2026-10-28** — Home electricity $0.23/kWh all-in (Alberta average incl. delivery and transmission ~22.9¢). Public fast charging $0.60/kWh (Electrify Canada Alberta). 85% home charging when home charging = yes. NRCan kWh ratings include charging losses, so none are added.
- **2026-10-28** — Registration $93/year; Alberta EV tax $200/year for battery-electric only (since Feb 13, 2025; hybrids and PHEVs exempt).
- **2026-10-28** — Insurance: Alberta average $1,903 (AIRB 2026 report, 2025 data), treated as the premium for a car worth about $25,000, scaled by (value ÷ 25,000)^0.35 and by class (sports cars ×1.25). Clearly labelled as a rough estimate. +3%/year.
- **2026-10-28** — Winter: +15% fuel for gas cars (NRCan/EPA: 12–28% in city driving), +20% hybrids (estimate), +35% energy for EVs (CAA test 14–39% range loss; Recurrent ~30%), applied for the winter months only.
- **2026-10-28** — **Rebates checked:** the federal iZEV program is closed. The federal **Electric Vehicle Affordability Program (EVAP)** is active in 2026: up to $5,000 (EV) / $2,500 (PHEV), final transaction price $50,000 or less (no cap for Canadian-made), made in Canada or a free-trade partner country, one per person, applied at the dealer; drops to $4,000 on Jan 1, 2027. Leases of 48+ months get the full amount; 75/50/25% for 36/24/12 months (from dealer guides, not yet confirmed on the Transport Canada page). Default: applied automatically to new EVs/PHEVs under the cap; we can't check country of manufacture per vehicle, so the tooltip asks users to confirm. **Alberta has no provincial EV rebate.**
- **2026-10-28** — Federal luxury tax on new cars over $100,000 (lesser of 10% of price or 20% of the excess) is added automatically.
- **2026-10-28** — Dealer costs: freight/PDI $2,200 (new), documentation fee $599, A/C excise tax + tire levy $116 (new). GST 5% on price + fees − trade-in.
- **2026-10-28** — Loans: 6.6% APR new (Bank of Canada, spring 2026), 10.3% used, 72 months, 10% down. Leases: 4.99%, term = ownership period (24–60 months), 20,000 km/year, 12¢/km over, $650 acquisition, $400 disposition.
- **2026-10-28** — Maintenance per km: gas 7¢, diesel 8¢, hybrid 6.5¢, PHEV 6¢, EV 4¢ (ThinkEV 2026 annual ranges), ×1.05–1.2 for bigger vehicles, ×1.3 for luxury brands. Tires: winter set on rims at the start ($1,300–$2,200 by class), replacement sets every 60,000 km. Repairs: $600/year after a 3-year warranty ($450 EV, ×1.5 luxury). Home Level 2 charger $2,000 installed.
- **2026-10-28** — Depreciation: Canadian Black Book reports cars keep about 72–80% after 1 year, 52–61% after 3, 40–45% after 5, and the average 4-year-old keeps 57%. Our curve: 78% after year 1, then ×0.89 a year to year 5 (62% at 3, 49% at 5), then ×0.92 a year (older cars lose value more slowly). Strong-resale brands and pickups +4/+2 points, weaker European luxury brands −4/−3, EVs −6/−3 (estimates).
- **2026-10-28** — Default driving: 40 km a day, 7 days a week (14,560 km/year), 55% city, 5 years, 5 winter months.

## Calculation choices

- **2026-10-28** (approved with the plan) — Loan: dealer fees and GST are financed. Loan total = down payment + trade-in + payments in the period + balance still owing at the end; resale is subtracted in "Net cost".
- **2026-10-28** — Lease: Canadian formula (depreciation part + (cap cost + residual) × money factor, money factor = rate% ÷ 2400), GST on each payment and on the down payment. Lease shorter than the period → a similar new lease is assumed (with a note). Longer → only months inside the period, no early-exit penalty. Buyout at residual shown, never added.
- **2026-10-28** — Cash (team rule): purchase price excluded by default, together with resale; visible toggle "Include purchase price for cash"; note shown in the column.
- **2026-10-28** — "Lowest cost" badge: lowest net cost; if any cash column excludes its price, it compares running costs only, and the page says so.
- **2026-10-28** — Per month and per km use the net cost. The chart shows "cost if you stopped at the end of each year" (paid so far + loan balance − value of the car then), so every line ends at the column's net cost.
- **2026-10-28** — No discounting (time value of money). Listed as a limit on "How we calculate"; could be an option in December.
- **2026-10-28** — Units: miles mode shows miles, US mpg (235.2 ÷ L/100 km) and miles per kWh. All maths stays metric.

## Design

- **2026-10-28** — Name "DriveTally" (placeholder; alternatives offered: Kilo, TrueRide AB, CostLane). Accent deep teal `#0F766E` (5.5:1 contrast on white). Inter font. Layout modelled on the feel of a premium car-maker compare page (white space, black text, aligned rows, collapsible sections) without using any of its branding, fonts, photos or text.
- **2026-10-28** — The sticky column header shrinks to name + payment option once the photos scroll away, so it doesn't take a third of the screen. On phones, columns scroll sideways with snap and the header scrolls with them; the "Your driving" panel starts collapsed.
- **2026-10-28** — Share links hold the whole comparison in the URL (compressed), so they open for anyone without sign-in and need no database.

## Testing

- **2026-10-28** — 17 automated tests in `src/lib/calc/calc.test.ts`, including 8 hand-worked examples (gas and EV; loan, lease, cash; long loan; lease renewal; PHEV energy split). All pass.
- **2026-10-28** — Browser check (Chromium, desktop 1440 px and iPhone 13 size): add four vehicles via search, switch payment options, edit a price, reset, differences-only, include cash price, share link opened in a fresh private window (all four columns rebuilt), no console errors. Search finds a 2015 car, 2026 cars, EVs (Model Y, IONIQ 5, Silverado EV), PHEVs (Prius Prime, RAV4 plug-in) and pickups (F-150, Tundra).

## Status (2026-10-28) and what's next

- Done: data import, prices for every vehicle, calculation module and tests, all five pages, share link, print view, sign-in and saving code.
- Waiting on the team: Supabase, Vercel and Google accounts (`docs/SETUP.md`), then live testing of sign-in and saving.
- Waiting on network access: www150.statcan.gc.ca (price index); Wikimedia pre-fetch (works from Vercel).
- December: more verified prices, photos per generation/year, Safari check, accessibility audit, print polish.
