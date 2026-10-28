# DriveTally — project plan (step 1 of 7)

Status: **waiting for the team's OK** (written 2026-10-28).
Full brief: [`BUILD_PROMPT.md`](BUILD_PROMPT.md).

---

## 1. What I'll build, in one paragraph

A website where someone in Alberta picks up to 4 "columns" (car + Loan / Lease / Cash), sets how they drive, and sees the full cost over 1–8 years, side by side. Guests can use it freely. Signed-in users can save comparisons. Every number comes from a named source or a formula shown on the "How we calculate" page.

## 2. Tools (all free tiers)

| Job | Tool | Why |
|---|---|---|
| Website | Next.js 15 + TypeScript + Tailwind CSS | What you asked for; Vercel runs it with zero setup |
| Hosting | Vercel (Hobby plan, free) | Auto-deploys every time code is pushed to GitHub |
| Sign-in + database | Supabase (free plan: 500 MB database, 50,000 monthly users) | Magic link + Google sign-in built in; Postgres with fast text search |
| Chart | Recharts | Simple line chart, works on phones |
| Tests | Vitest (maths), Playwright (real browser clicks) | Proves the totals and the pages work |
| Font | Inter (Google Fonts, free licence) | Clean, neutral, like the reference page |

The vehicle list (~30,000 rows from NRCan) fits easily in the Supabase free plan.

## 3. How the work is split

```
app/                 pages (home, compare, my comparisons, how we calculate, sign-in)
components/          compare grid, column header, pickers, inputs panel, chart
lib/calc/            ALL the maths, in one place, with tests  ← professor can read this
lib/defaults/        Alberta default values, each with source + date
scripts/data/        NRCan + EPA import, price import, photo lookup (re-runnable each year)
supabase/            database tables and security rules
docs/                this plan, the brief, data coverage reports
DECISIONS.md         dated log of every assumption and source
README.md            plain-English "how to run, update, redeploy"
```

## 4. Database (Supabase)

- `vehicles` — one row per NRCan entry: year, make, model, trim/description, class, engine/motor, transmission, fuel type, city/hwy/combined (L/100 km, kWh/100 km, Le/100 km), EV range, PHEV electric range, source file, EPA cross-check flag. Text-search index so "2024 civic hybrid" is instant.
- `vehicle_prices` — MSRP per year/make/model/trim, with `status` = verified or estimate, source URL and date checked.
- `model_photos` — cached Wikimedia photo per make/model/generation, with photographer, licence and link.
- `comparisons` — saved comparisons: owner, name, all inputs (as one JSON block), dates. Security rule: you can only see your own.
- Share links don't need the database: the whole comparison is packed into the URL, so it opens for anyone, signed in or not.

## 5. Sketch of the compare page (desktop)

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ DriveTally                              Compare   How we calculate   My comparisons  [Sign in] │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ YOUR DRIVING  (shared by all columns)                                       [ Edit ▾ ] │
│ 40 km/day · 5 days/wk · 55% city · 5 years · 5 winter months · home charging: yes      │
│ Gas $1.39/L · Home power $0.24/kWh · Public $0.55/kWh            [Show differences only ◻] │
├──────────────────┬──────────────────┬──────────────────┬──────────────────────────────┤
│ STICKY HEADER    │                  │                  │                              │
│ [ photo ]     ×  │ [ photo ]     ×  │ [ photo ]     ×  │                              │
│ 2025 Toyota      │ 2025 Toyota      │ 2025 Tesla       │      ┌──────────────┐        │
│ RAV4 Hybrid XLE  │ RAV4 Hybrid XLE  │ Model Y LR AWD   │      │ + Add vehicle│        │
│ ( Loan )         │ ( Lease )        │ ( Cash )         │      └──────────────┘        │
│ photo: J. Smith, CC BY-SA 4.0                                                          │
├──────────────────┼──────────────────┼──────────────────┼──────────────────────────────┤
│ Total, 5 yrs     │ $41,200          │ $38,900 ★Lowest  │ $14,100*                     │
│ Per month / km   │ $687 · $0.79     │ $648 · $0.75     │ $235 · $0.27                 │
│ Running only     │ $19,800          │ $19,800          │ $14,100                      │
│                  │                  │ *Purchase price not included — compare running    │
│                  │                  │  costs for like-for-like.                         │
├──────────────────┴──────────────────┴──────────────────┴──────────────────────────────┤
│ ▾ Getting the car                                                                      │
│   Price             $42,000          $42,000            $59,990                        │
│   Dealer fees       $2,100           $1,000             $2,100                         │
│   GST (5%)          $2,205           (on payments)      $3,105                         │
│   Down payment      $5,000           $3,000             —                              │
│ ▸ Financing                                                                            │
│ ▸ Running costs                                                                        │
│ ▸ End of period   (loan balance, resale value, lease buyout — buyout not in total)     │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ Cumulative cost by year      [line chart: one line per column, years 0–5]             │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ Estimates only, not financial advice. Data as of …   [Print / PDF] [Share link]  km ⇄ mi │
└───────────────────────────────────────────────────────────────────────────────────────┘
```
(Numbers above are placeholders for the sketch, not results.)

**Phone:** the driving panel folds into a button at the top; columns become cards about 85% of the screen wide that swipe sideways and snap; the sticky header shrinks to photo thumbnail + name + pill.

**Adding a car:** a panel slides in with a search box ("2024 civic hybrid") and, under it, four steps: Year → Make → Model → Trim. Then Loan / Lease / Cash. Every pre-filled number has a small "reset to default" link.

## 6. The maths (summary — full detail goes on "How we calculate")

- Yearly km = km/day × days/week × 52 (or typed in directly).
- Energy per km = city% × city rating + highway% × highway rating, then a winter uplift for the winter months (separate rates for gas and EV, editable, sourced). PHEV km split into electric share and gas share.
- Running costs = energy + insurance + maintenance + tires + repairs (after warranty) + registration + parking, with optional yearly price increase.
- **Loan** = down payment + trade-in used + payments made in the period + balance still owing at the end. Interest shown as its own line.
- **Lease** = down payment + monthly payments incl. GST for the period + acquisition/disposition fees + excess-km charges. "Buyout at residual" shown, not added.
- **Cash** = price + fees + GST **only if** "Include purchase price for cash" is on (default off). When off, resale is also left out.
- **Net cost** = total − estimated resale (loan; cash when price included).

## 7. Choices I've made — tell me if you disagree

1. **Fees and GST on a loan** are added to the amount borrowed (that's what most Alberta dealers do). The user can change the down payment to cover them instead.
2. **"Lowest cost" badge** goes on the lowest **Net cost**. With a cash column whose price is excluded, the badge compares **running costs only** across all columns instead, so it's never unfair. A note says which basis is used.
3. **Lease term shorter than the ownership period** (e.g. 4-year lease, 5-year period): I'll assume the user signs a similar new lease for the remaining months, and show a note. If the term is longer, only payments inside the period are counted (no early-exit penalty).
4. **Model years:** I'll import every year NRCan publishes (back to 1995), but the year picker starts at 2010 by default with a "show older" link, to keep it tidy.
5. **Site name:** keep **DriveTally**, or consider **Kilo** ("what every kilometre costs"), **TrueRide AB**, or **CostLane**. **Accent colour:** deep teal `#0F766E` — strong contrast on white (passes accessibility rules), not tied to any car brand, and different from the black/silver feel of the reference page.

## 8. Risks and honest expectations

| Risk | Impact | What I'll do |
|---|---|---|
| **This cloud workspace currently blocks open.canada.ca, fueleconomy.gov and Wikimedia** | Can't download vehicle data or photos until fixed | You need to allow 4 web addresses (steps below). Everything else can start now. |
| No free complete Canadian MSRP data | Many cars will have an empty, required price field | Realistic target by Nov 13: about 50 top models × recent years, mostly base and popular trims, marked verified or estimate. Wider by December. |
| EV rebate status changes | Wrong defaults | I'll check federal and Alberta status during the build, log it with the date, default to $0 if nothing is active. |
| Insurance estimates are rough | Big real-world spread | Clear note on screen; ranges by class and price, sourced. |
| Paid data services (Canadian Black Book prices, licensed car photos such as evox or Imagin) | Usually quote-based, no public price | I'll research and report what I can confirm, and say where you'd need to ask for a quote. I won't guess a price. |

**The Nov 13 date is realistic if the network access is fixed in the next 2–3 days.** If it slips, the first thing I'd cut is photo coverage (fallback outlines are fine for a demo), then PDF styling — not data or maths.

## 9. Timeline

| By | What |
|---|---|
| Oct 30 | Plan OK'd · network access fixed · NRCan import + coverage report |
| Nov 2 | Calculation module + 6 hand-worked tests passing |
| Nov 6 | Compare page with real data, photos, chart (runs locally) |
| Nov 9 | Supabase accounts, sign-in, saving, share link |
| Nov 11 | Live on Vercel; browser and phone checks |
| **Nov 13** | **Presentable model, live link** |
| Early Dec | Wider price coverage, accessibility pass, print polish, final tests |

## 10. What I need from you

**Now:**
1. Reply "OK" (or tell me what to change) on this plan, including the 5 choices in section 7.
2. Open the network access (one person, about 2 minutes):
   1. In this Claude Code session, open the cloud environment menu in the title bar and click **Edit**.
   2. Under **Network access**, choose the **Limited** level (or **Custom** if that's what you see), and keep **Allow package managers** ticked.
   3. Under **Allowed domains**, add these, one per line:
      `open.canada.ca`, `natural-resources.canada.ca`, `www.fueleconomy.gov`, `commons.wikimedia.org`, `upload.wikimedia.org`, `www.wikidata.org`, `en.wikipedia.org`
   4. Save, then tell me it's done. Official steps: https://code.claude.com/docs/en/cloud-environments#network-access

**Later (I'll walk you through each one, step by step, when we get there):** a Supabase account, a Vercel account, and a Google Cloud project for "Sign in with Google".
