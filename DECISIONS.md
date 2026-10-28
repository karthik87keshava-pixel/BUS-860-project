# Decisions log

Every assumption, data source and design choice, with the date. Newest at the bottom of each section.

## Process

- **2026-10-28** — Project started. Brief saved as `docs/BUILD_PROMPT.md`. Plan written in `docs/PLAN.md`; waiting for team OK before building.
- **2026-10-28** — Stack: Next.js + TypeScript + Tailwind CSS on Vercel, Supabase for sign-in and database, GitHub for code (as requested by the team). Recharts for the chart, Vitest and Playwright for tests, Inter font.

## Data sources

- **2026-10-28** — The cloud workspace's network policy blocked `open.canada.ca`, `www.fueleconomy.gov` and `commons.wikimedia.org` on first try. Team asked to allow these domains before the data import (step 2).

## Calculation choices (proposed, awaiting team OK)

- **2026-10-28** — Loan: dealer fees and GST are added to the amount borrowed by default.
- **2026-10-28** — "Lowest cost" badge uses Net cost; switches to running costs only when any cash column excludes the purchase price.
- **2026-10-28** — Lease term shorter than the ownership period: assume a similar new lease for the remaining months, with a note. Longer term: count only payments inside the period, no early-exit penalty.
- **2026-10-28** — Import every NRCan model year; year picker shows 2010+ by default with a "show older" link.

## Design

- **2026-10-28** — Placeholder name "DriveTally". Proposed accent colour deep teal `#0F766E` (contrast ratio about 5.5:1 on white, passes WCAG AA for text).
