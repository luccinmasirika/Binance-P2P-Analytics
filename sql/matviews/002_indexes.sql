-- Run these statements one at a time (Supabase SQL editor wraps everything in
-- a transaction, and CREATE INDEX CONCURRENTLY cannot run inside one).
-- Dropped CONCURRENTLY here because the scraper writes every 10 min so the
-- brief exclusive lock during index build is acceptable. If you have psql
-- access with autocommit, feel free to re-add CONCURRENTLY.

-- Covers the EXISTS filter in runDecayFillsQuery and the primary_pay_type
-- lookup in getCurrentStats. Composite (ad_id, pay_type) allows index-only
-- scans when pay_type is bound.
CREATE INDEX IF NOT EXISTS ad_payment_methods_ad_id_paytype_idx
  ON ad_payment_methods (ad_id, pay_type);

-- Leading with fiat lets the planner seek once per country before range
-- scanning scraped_at; trailing adv_no keeps the window-function partition
-- input in index order.
CREATE INDEX IF NOT EXISTS ads_fiat_scraped_at_adv_no_idx
  ON ads (fiat, scraped_at, adv_no);
