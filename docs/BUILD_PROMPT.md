# Build prompt: Alberta car cost comparison website

Paste everything below into Claude Code as your first message. Also save this file in the project folder so the team and Claude Code can refer back to it.

---

## Who we are and how to work with us

We're a UAlberta EMBA team (BUS 860, Managing Intelligence). None of us can code. You (Claude Code) will write all the code, set everything up, test it and deploy it.

- Never ask us to edit code. If something needs a human (creating an account, clicking "approve", pasting a key), give us numbered, plain-English steps, one at a time, and wait until we confirm.
- Keep a `README.md` that explains in plain English how to run, update and redeploy the site.
- Keep a `DECISIONS.md` log: every assumption, data source and design choice, with the date. Our professor will read this.
- Never put passwords or secret keys in the code or in GitHub. Use environment variables and tell us where to paste them.
- Before calling any step done, test it yourself in a browser and fix what's broken.

## Deadlines

- **Working, presentable model: by Friday, November 13, 2026.** Real data, real calculations, deployed online, sign-in working.
- **Final version: early December 2026.** Polish, wider price coverage, accessibility, testing.

If something threatens the November date, tell us early and suggest what to cut.

## What the site does

People in Alberta compare what it really costs to get and run up to 4 cars over a period they choose (default 5 years). Each comparison column is a **car + payment option**, so a user can compare, say, a 2025 Toyota RAV4 Hybrid on a loan, the same RAV4 on a lease, and a 2025 Tesla Model Y paid in cash.

Payment options: **Loan, Lease, Cash.**

It's a polished class demo first, and may go public later, so build it to public-site quality.

## Scope

- Alberta only: 5% GST, no PST, Alberta fuel and electricity prices, Alberta registration fees, Alberta insurance estimates.
- Fuel types: gas, hybrid, plug-in hybrid (PHEV), electric (EV). Diesel too if it's in the data.
- Currency: CAD.
- No car specs comparison (no horsepower, cargo space, etc.). Costs only.

## Pages

1. **Home page**: short intro, a clear "Start a comparison" button, and "Sign in". Guests can build a comparison without signing in; signing in lets them save it.
2. **Compare page**: the main tool (details below).
3. **My comparisons**: signed-in users see saved comparisons and can open, rename, duplicate and delete them.
4. **How we calculate**: every formula, default value and data source, with the date each source was checked. Written for a business-school reader.
5. Sign-in / sign-up: email (magic link) and Google sign-in.

## Look and feel

Model the layout and feel on the Mercedes-Benz Canada compare page (https://www.mercedes-benz.ca/en/compare-vehicles/2025-glb-glb35w4/2027-glc-glc300c4): lots of white space, black text, side-by-side columns, aligned rows, and collapsible sections. Copy the feel only. Do **not** use the Mercedes name, logo, star, fonts, photos or any of their text.

- **Sticky header row** for each column: car photo, year make model trim, a payment-option pill (Loan / Lease / Cash), and a remove (×) button. It stays at the top while the user scrolls the rows.
- **Empty column slot** with a large "+ Add vehicle" button until 4 columns are filled.
- **Collapsible sections** with a chevron, and every row lined up across all columns so numbers are easy to compare.
- A **"Show differences only"** toggle that hides rows where all columns match.
- Neutral palette (white, black, greys) with one accent colour. Use a free font such as Inter. Suggest a site name and accent colour; use "DriveTally" as a placeholder until we pick.
- Desktop: 4 columns side by side. Phone: columns scroll sideways with snap, header stays sticky.
- **Units toggle hidden at the bottom of the page** (in the footer): km ↔ miles. In miles mode show mpg / miles per kWh too. All maths stays in metric internally.

## Adding a car (search and selection)

Step-by-step pickers: **Year → Make → Model → Trim/version**, plus a type-ahead search box ("2024 civic hybrid"). Then pick Loan, Lease or Cash.

Every pre-filled number must be editable by the user, with a small "reset to default" link.

## Vehicle data: this is the most important part

**Requirement (non-negotiable from the team): an exhaustive list of every make, model and year, for every fuel type, with the data needed to run the calculations.**

Do it like this:

1. **Master vehicle list and fuel/energy use: Natural Resources Canada (NRCan) Fuel Consumption Ratings** on open.canada.ca. It covers Canadian-market vehicles across many model years, with separate files for conventional/hybrid, plug-in hybrid and battery-electric vehicles. Download every file and every year available, check the column formats (they change between years), and import them all. Store make, model, year, trim/description, vehicle class, engine/motor, transmission, fuel type, city / highway / combined consumption (L/100 km, kWh/100 km, Le/100 km), EV range and PHEV electric range.
2. **Cross-check against fueleconomy.gov (US EPA)** to fill gaps, and log in `DECISIONS.md` any car you added or fixed this way.
3. **Build a script that refreshes the data** from these sources, so we can update it each year. Report how many vehicles were imported per year and fuel type, and list any rows you couldn't use.
4. **Prices (MSRP):** there's no free, complete Canadian price database. Research and pre-fill Canadian MSRP for as many current and recent model years as you can (start with the 50 best-selling models in Canada for 2022–2027, then widen). Mark each price as "verified" (with source and date) or "estimate". Where you have no price, the price field is required and empty, with a hint. Tell us honestly what coverage you reached, and whether a paid price data service (for example Canadian Black Book) would close the gap and what it would cost.
5. Store the vehicle data in the database (see "Accounts and saving") with fast search.

## Car photos

The team wants a **real photo of the selected car**, not a drawing.

- Use free-licence photos from **Wikimedia Commons** (via the Wikipedia/Wikidata APIs), matched by make, model and, where possible, generation/year. Cache the image URL per model and generation.
- Show the photographer credit and licence in small text (the licence requires this).
- If no photo is found, show a clean body-type outline (sedan, SUV, truck, hatchback, van) as a fallback, and log the gap.
- Do not scrape manufacturer or dealer websites for photos. Tell us whether a licensed car-image service would give exact year/trim/colour photos and what it costs, so we can decide for the public launch.

## Inputs (left panel or top bar, shared by all columns)

Usage:
- km per day and days driven per week (or switch to "km per year")
- City / highway split (slider, default 55% city)
- Ownership period: slider 1–8 years, default 5
- Winter months per year (default 5) — raises fuel use for gas cars and cuts EV/PHEV efficiency
- Home charging available? (yes/no) and share of charging at home vs public
- PHEV: share of km driven on electric (default from the data's electric range and daily km)
- Monthly parking cost (default $0)

Prices (Alberta defaults, all editable, each with a source note):
- Gas price per litre (regular and premium), with optional yearly increase %
- Home electricity cost per kWh **including** Alberta delivery and transmission charges, and public fast-charging cost per kWh
- Annual registration fee (Alberta)
- Insurance per year: estimate by vehicle class and price, with a clear note that real quotes vary a lot
- Maintenance per km by fuel type and vehicle class (CAA Driving Costs is a good source to check)
- Tires: one set of winter tires plus rims at the start, and tire replacement based on km
- Repairs reserve per year after the warranty ends
- EV home charger install (one-time, default if home charging = yes)
- Rebates: check the current federal and Alberta EV rebate status when you build this. Don't assume. Default to $0 if none is active and log what you found.

## Payment-option inputs (per column)

**Loan:** price, dealer fees (freight/PDI, documentation), GST, down payment, trade-in value, interest rate (APR), loan term in months.

**Lease:** price (cap cost), down payment, interest rate or money factor, lease term (defaults to the ownership period), residual value %, yearly km allowance, excess km charge per km, acquisition and disposition fees. GST applies to each lease payment.

**Cash:** price, dealer fees, GST.

## How to calculate

Put all maths in one separate, well-commented calculation module with automated tests. Write at least 6 worked examples by hand in the tests (one per payment option, gas and EV), and show one of them step by step on the "How we calculate" page.

- Yearly km = km per day × days per week × 52.
- Energy cost: weighted city/highway consumption, winter adjustment, × price, with price increase per year if set. PHEV splits km between gas and electric.
- Running costs (all options): fuel/electricity, insurance, maintenance, tires, repairs, registration, parking.
- **Loan:** down payment + payments made during the period + loan balance still owing at the end. Show interest paid as its own line.
- **Lease:** down payment + monthly payments (with GST) for the period + fees + excess km charges. The lease cost is capped to the chosen number of years. **Show "Buyout at residual" as a separate line, only for lease columns, and do not add it to the total.**
- **Cash:** the team treats a cash purchase as a sunk cost, so by default the cash price is **not** added to the cash column's total. Add a visible toggle "Include purchase price for cash", default **off**, and when it's off show a small note in the cash column: "Purchase price not included — compare running costs for like-for-like." (If the price is excluded, also exclude resale value for that column.)
- **Car value at the end:** for loan and cash, estimate resale value using yearly depreciation rates by brand/class (editable, sources logged). Show it as a line and in "Net cost".

## Results (per column)

At the top of each column:
- Total cost for the period
- Cost per month and cost per km
- **Running costs only** (always shown, so every column can be compared like-for-like)
- A "Lowest cost" badge on the cheapest column

Collapsible sections underneath, rows aligned across columns:
1. Getting the car (price, fees, GST, down payment, trade-in)
2. Financing (payments, interest, lease fees, excess km)
3. Running costs (each item per year and total)
4. End of period (loan balance, resale value, lease buyout at residual — lease only)

Below the columns: a chart of **cumulative cost by year** with one line per column.

## Extras

- **Share link**: a URL that rebuilds the same comparison for anyone (no sign-in needed to view).
- **Print / save as PDF** view with a clean layout.
- Disclaimer in the footer: estimates only, not financial advice, data date shown.

## Accounts and saving

Use a setup that a non-coding team can run on free tiers:
- **Next.js + Tailwind CSS**, deployed on **Vercel**.
- **Supabase** for sign-in (email magic link + Google) and the database (vehicle data, saved comparisons per user).
- Code on **GitHub**.

Walk us through creating each account, step by step. Saved comparisons store all inputs, so opening one later recalculates with the same settings.

## Quality checks before you hand over

- Works on Chrome, Safari and a phone screen.
- Search finds a 2015 car, a 2026 car, an EV, a PHEV and a pickup truck.
- Totals match your hand-worked test examples.
- Sign in, save, sign out, sign back in, and the comparison is still there.
- Share link opens correctly in a private window.
- Basic accessibility: keyboard navigation, readable contrast, alt text on photos.

## Order of work

1. Plan: show us a short plan and a simple sketch of the compare page. Wait for our OK.
2. Import the NRCan data and report coverage.
3. Calculation module + tests.
4. Compare page with real data and photos.
5. Accounts, saving, share link.
6. Deploy to Vercel and give us the live link (target: November 13).
7. Polish and price coverage for December.
