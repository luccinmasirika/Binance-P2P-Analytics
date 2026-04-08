# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Binance P2P RWF Analyzer — Next.js application that scrapes Binance P2P USDT/RWF ads in Rwanda, stores snapshots in Supabase PostgreSQL, and provides an analytics dashboard with market depth visualization, trader behavior analysis, profit simulator with backtesting, and Telegram alerts for trading opportunities.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **DB**: Supabase PostgreSQL + Drizzle ORM (`drizzle-orm/node-postgres`)
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Validation**: Zod
- **Alerts**: Telegram Bot API
- **Forex rates**: Frankfurter API (free, no key, supports RWF)
- **Scraper runtime**: `tsx` (executed by GitHub Actions cron every 10 min)
- **Deployment**: Vercel (web app) + GitHub Actions (scraper)

## Commands

```bash
pnpm dev                 # Start Next.js dev server
pnpm build               # Build for production
pnpm lint                # Run ESLint
pnpm drizzle-kit push   # Push schema changes to Supabase
pnpm drizzle-kit studio # Open Drizzle Studio (DB browser)
pnpm tsx src/scripts/scrape.ts  # Run scraper manually
```

## Environment Variables

- `DATABASE_URL` — Supabase PostgreSQL connection string (required everywhere)
- `TELEGRAM_BOT_TOKEN` — Telegram bot token for alerts (required for scraper)
- Local dev: `.env.local`
- GitHub Actions: repository secrets
- Vercel: environment variables

## Architecture

### Five main parts

1. **Scraper** (`src/lib/scraper/`) — Fetches Binance P2P ads, USD/RWF forex rate, computes market depth snapshots, and checks alert conditions. Runs as standalone script via GitHub Actions cron (every 10 min). Entry point: `src/scripts/scrape.ts`.

2. **Dashboard** (`src/app/page.tsx`) — Visualizes price evolution, BUY/SELL spreads, volume, market depth (order book), heatmap of optimal trading hours, and forex rate overlay (P2P price vs official USD/RWF rate).

3. **Trader Analysis** (`src/app/traders/page.tsx`) — Tracks competitor behavior: top traders by volume, hourly posting patterns, pricing history, market maker identification (presence >80% of snapshots).

4. **Simulator** (`src/app/simulator/page.tsx`) — Backtesting engine with realistic modeling: fictional profile (capital, payment methods, time available), mobile money fees deduction, trade delay modeling (sell price = next snapshot), price strategy selection (1st/2nd/3rd best price).

5. **Alerts** (`src/app/alerts/page.tsx`) — Configure Telegram notifications triggered when market conditions match (spread above threshold, price below/above target). Evaluated on each scrape with cooldown to avoid spam.

### Data sources

**Binance P2P API** (primary):
- `POST https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search`
- No authentication required
- Asset: USDT only, Fiat: RWF, TradeType: BUY/SELL
- Returns prices as strings — Zod schemas handle string→number conversion
- Payment method codes discovered dynamically from responses
- 300ms delay between requests to avoid rate limiting

**Frankfurter API** (forex reference):
- `GET https://api.frankfurter.dev/v1/latest?from=USD&to=RWF`
- Free, no API key, updated daily
- Used to compare P2P price premium vs official exchange rate

### Data model (7 tables, snapshot-based)

Each scrape creates a `scrape_session`, then inserts ad snapshots forming a time series:

- `scrape_sessions` — tracks each scrape run (status, timing, ad count)
- `advertisers` — unique traders, upserted on each scrape (user_no is unique key)
- `ads` — one row per ad per session (price, amounts, trade type, timestamp)
- `ad_payment_methods` — payment methods per ad (many-to-many)
- `forex_rates` — USD/RWF official rate snapshots (source: frankfurter)
- `market_depth_snapshots` — aggregated volume per price level per trade type and payment method
- `alert_configs` — user-configured alert rules with Telegram chat ID and cooldown

### Key query patterns

- **Spread**: best SELL price - best BUY price at each timestamp
- **P2P premium**: (P2P price / official forex rate - 1) × 100%
- **Optimal hours**: aggregate spreads by hour-of-day × day-of-week (heatmap)
- **Market depth**: volume available at each price level, by payment method
- **Trader patterns**: presence frequency, posting hours, price adjustment history
- **Simulation**: filter ads by capital range + payment methods, apply fees, model delay between buy and sell

### Code organization

- `src/lib/db/` — Drizzle schema and database client
- `src/lib/scraper/` — Binance P2P fetch, forex fetch, Zod types, scrape orchestration
- `src/lib/queries/` — Reusable DB queries (ads, stats, depth, traders, simulation)
- `src/lib/alerts/` — Telegram notification logic
- `src/lib/constants/` — Mobile money fees (MTN MoMo: 20 RWF/tx, etc.)
- `src/app/api/` — Next.js API routes (ads, stats, depth, traders, simulate, alerts)
- `src/components/` — React components (charts, dashboard, traders, simulator)
- `src/scripts/` — Standalone scripts (scraper entry point for GitHub Actions)
- `.github/workflows/scrape.yml` — Cron workflow every 10 minutes

## Conventions

- All numeric values from Binance API arrive as strings — always validate/transform with Zod, never cast manually
- Scraper deduplicates ads by `adv_no` within a session
- Timestamps are PostgreSQL `timestamp` type (UTC)
- DB columns use snake_case, TypeScript uses camelCase (Drizzle handles mapping)
- Mobile money fees are defined in `src/lib/constants/fees.ts` — update if rates change
- Simulation uses next-snapshot price for sell (not same-snapshot) to model real-world delay
