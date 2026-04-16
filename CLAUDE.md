# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Binance P2P Analyzer — Next.js application that scrapes Binance P2P USDT ads across multiple African fiat markets (RWF primary, plus KES, UGX, … defined in the `countries` table), stores snapshots in Supabase PostgreSQL, and provides an analytics dashboard with market depth visualization, trader behavior analysis, profit estimation, a backtesting simulator, and Telegram alerts for trading opportunities. The whole app is gated behind a single-admin login.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **DB**: Supabase PostgreSQL + Drizzle ORM (`drizzle-orm/node-postgres`)
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Validation**: Zod
- **Auth**: Static-credentials session cookie enforced by Next.js middleware
- **Alerts**: Telegram Bot API
- **Forex rates**: Frankfurter API (free, no key, supports RWF and the other supported fiats)
- **Scraper runtime**: `tsx` (executed by GitHub Actions cron every 10 min)
- **Deployment**: Vercel (web app) + GitHub Actions (scraper)

## Commands

```bash
pnpm dev                        # Start Next.js dev server
pnpm build                      # Build for production
pnpm lint                       # Run ESLint
pnpm drizzle-kit push           # Push schema changes to Supabase
pnpm drizzle-kit studio         # Open Drizzle Studio (DB browser)
pnpm tsx src/scripts/scrape.ts  # Run scraper manually
```

Raw SQL for materialized views and hot-path indexes lives in `sql/matviews/*.sql`. Apply to Supabase manually (SQL editor or `psql`) — drizzle-kit does **not** manage these. Files are append-only and idempotent (`IF NOT EXISTS`, `CONCURRENTLY`).

## Environment Variables

- `DATABASE_URL` — Supabase PostgreSQL connection string (required everywhere)
- `TELEGRAM_BOT_TOKEN` — Telegram bot token for alerts (required for scraper)
- Local dev: `.env.local`
- GitHub Actions: repository secrets
- Vercel: environment variables

## Architecture

### Main parts

1. **Scraper** (`src/lib/scraper/`) — Fetches Binance P2P ads, USD→fiat forex rate, computes market depth snapshots, and checks alert conditions. Runs as a standalone script via GitHub Actions cron (every 10 min). Entry point: `src/scripts/scrape.ts`.

2. **Dashboard** (`src/app/page.tsx`) — Price evolution, BUY/SELL spreads, volume, market depth (order book), heatmap of optimal trading hours, and P2P-vs-official-forex premium overlay.

3. **Trader Analysis** (`src/app/traders/page.tsx`) — Top traders by volume, hourly posting patterns, pricing history, market maker identification (presence >80% of snapshots), and **estimated profits** (see `src/lib/queries/trader-profit.ts` — inferred from `tradable_quantity` decay between consecutive snapshots of the same `adv_no`, validated against `month_order_count` delta).

4. **Simulator** (`src/app/simulator/page.tsx`) — Backtesting with realistic modeling: fictional profile (capital, payment methods, time available), mobile money fees deduction, trade delay modeling (sell price = next snapshot), price strategy (1st/2nd/3rd best price).

5. **Alerts** (`src/app/alerts/page.tsx`) — Configure Telegram notifications triggered when market conditions match (spread above threshold, price below/above target). Evaluated on each scrape with cooldown to avoid spam.

6. **Countries** (`src/app/countries/page.tsx`) — Manage the set of supported fiat markets (activate/deactivate, edit pay types) backing the `countries` table.

7. **Auth** (`middleware.ts` + `src/app/login/` + `src/lib/auth.ts`) — Single admin account (credentials hardcoded in `src/lib/auth.ts`), session cookie `p2p_session`. Middleware redirects unauthenticated traffic to `/login` for every path except `/login` and `/api/logout`.

### Global fiat selector

The active fiat is global and persists across pages:

- Server-side: `src/lib/fiat-cookie.ts` reads/writes the `p2p_fiat` cookie and falls back to the first active country (or `RWF`) when unset.
- Client-side: `src/components/providers/fiat-provider.tsx` exposes `useFiat()` to every page under the main layout. The layout (`src/app/layout.tsx`) hydrates the provider from the cookie.
- UI: `src/components/nav/country-selector.tsx` is in the header; switching a country POSTs `/api/fiat`, updates the cookie, and calls `router.refresh()`.
- API routes fallback chain: explicit `fiat` URL param → `getActiveFiat()` (cookie) → `RWF`.
- Adding a country (`src/app/countries/page.tsx`) fires an immediate `POST /api/scrape` so the first data points land without waiting for the 10-min cron.

### Data sources

**Binance P2P API** (primary):
- `POST https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search`
- No authentication required
- Asset: USDT only; fiat and trade type (BUY/SELL) iterated per active country
- Returns prices as strings — Zod schemas handle string→number conversion
- Payment method codes discovered dynamically from responses
- 300ms delay between requests to avoid rate limiting

**Frankfurter API** (forex reference):
- `GET https://api.frankfurter.dev/v1/latest?from=USD&to={fiat}`
- Free, no API key, updated daily
- Used to compute the P2P premium vs official exchange rate

### Data model (9 tables, snapshot-based)

Each scrape creates a `scrape_session`, then inserts ad snapshots forming a time series:

- `countries` — supported fiat markets (fiat code, name, currency symbol, pay types, active flag)
- `scrape_sessions` — tracks each scrape run (status, timing, ad count)
- `advertisers` — unique traders, upserted on each scrape (`user_no` is the unique key)
- `advertiser_snapshots` — per-session reputation history (month order count, finish rate, positive rate, online status)
- `ads` — one row per ad per session (price, amounts, trade type, timestamp)
- `ad_payment_methods` — payment methods per ad (many-to-many)
- `forex_rates` — USD→fiat official rate snapshots (source: frankfurter)
- `market_depth_snapshots` — aggregated volume per price level per trade type and payment method
- `alert_configs` — user-configured alert rules with Telegram chat ID and cooldown

### Materialized views & indexes

Raw SQL lives in `sql/matviews/`:

- `001_create.sql` — hourly rollups that back the dashboard's hot-path queries:
  - `mv_ads_hourly(hour_bucket, fiat, asset, trade_type)` — used when no payType filter is active
  - `mv_ads_hourly_by_pay(hour_bucket, fiat, asset, trade_type, pay_type)` — used when a payType filter is active
  - Plus `ads_scraped_at_fiat_idx` on the raw `ads` table for matview refresh and 15min fallback queries
- `002_indexes.sql` — performance indexes (apply `CONCURRENTLY`):
  - `ad_payment_methods (ad_id, pay_type)` — covers `EXISTS` filters and primary-pay-type lookups
  - `ads (fiat, scraped_at, adv_no)` — supports the trader-profit decay window-function CTE

These matviews need to be refreshed — see `src/lib/queries/stats.ts` for how `getPriceHistory` / `getSpreadHistory` / `getHeatmapData` pick between matview and raw-ads fallback based on granularity (15min bypasses the matview).

### Key query patterns

- **Spread**: best SELL price − best BUY price at each timestamp
- **P2P premium**: (P2P price / official forex rate − 1) × 100%
- **Optimal hours**: aggregate spreads by hour-of-day × day-of-week (heatmap)
- **Market depth**: volume available at each price level, by payment method
- **Trader patterns**: presence frequency, posting hours, price adjustment history
- **Trader profit (inferred)**: consecutive same-price snapshots of an `adv_no` where `tradable_quantity` decreases → the delta is a filled order. Summed per trader into gross spread profit minus send/receive fees. See `src/lib/queries/trader-profit.ts`.
- **Simulation**: filter ads by capital range + payment methods, apply fees, model delay between buy and sell

### Trade-type semantics (important)

`ads.trade_type` reflects the **user perspective** (the Binance P2P tab the ad appears in), not the merchant perspective:
- `BUY` ad  = user can buy USDT = merchant **sold** USDT, received RWF → pays receive/cash-out fee
- `SELL` ad = user can sell USDT = merchant **bought** USDT, sent RWF → pays send fee

`calculateSendFee` / `calculateReceiveFee` in `src/lib/constants/fees.ts` follow this direction. The profit aggregator in `trader-profit.ts` and the effective-spread logic in `stats.ts` both depend on this convention — don't flip it.

### Code organization

- `src/lib/db/` — Drizzle schema and database client
- `src/lib/scraper/` — Binance P2P fetch, forex fetch, Zod types, scrape orchestration
- `src/lib/queries/` — Reusable DB queries (ads, stats, depth, traders, trader-profit, simulation)
- `src/lib/alerts/` — Telegram notification logic
- `src/lib/constants/` — Mobile money fees (MTN MoMo, Airtel Money, …)
- `src/lib/auth.ts` — Session constants for the static-credentials login
- `src/lib/fiat-cookie.ts` — Server helpers for reading/writing the active fiat cookie
- `src/components/providers/fiat-provider.tsx` — Client context exposing `useFiat()`
- `src/app/api/` — Next.js API routes (ads, stats, depth, traders, traders/profit, simulate, alerts, countries, fiat, logout, scrape)
- `src/app/login/`, `src/app/countries/` — auth + country management pages
- `src/components/` — React components (charts, dashboard, nav, traders, simulator, ui)
- `src/scripts/` — Standalone scripts (scraper entry point for GitHub Actions)
- `middleware.ts` — Next.js middleware enforcing the login gate
- `sql/matviews/` — Raw SQL migrations for materialized views and hot-path indexes (apply manually)
- `.github/workflows/scrape.yml` — Cron workflow every 10 minutes

## Conventions

- All numeric values from Binance API arrive as strings — always validate/transform with Zod, never cast manually
- Scraper deduplicates ads by `adv_no` within a session
- Timestamps are PostgreSQL `timestamp` type (UTC)
- DB columns use snake_case, TypeScript uses camelCase (Drizzle handles mapping)
- Mobile money fees are defined in `src/lib/constants/fees.ts` — update if rates change
- Simulation uses next-snapshot price for sell (not same-snapshot) to model real-world delay
- `fiat` is a first-class parameter on queries that scan the `ads` table — always pass it explicitly (trader-profit, stats, depth). Skipping `fiat` forces a multi-country scan and times out.
- Avoid correlated subqueries on `ad_payment_methods` in hot paths — use `LEFT JOIN LATERAL` or a pre-aggregated CTE (see `getCurrentStats` in `stats.ts` and `runDecayFillsQuery` in `trader-profit.ts`)
- New hot-path indexes go in a new `sql/matviews/NNN_*.sql` file, using `CREATE INDEX CONCURRENTLY IF NOT EXISTS`; do not extend existing numbered files
