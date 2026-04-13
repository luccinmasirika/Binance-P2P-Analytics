-- Supporting index on raw ads: speeds up matview CREATE/REFRESH and fallback queries.
CREATE INDEX IF NOT EXISTS ads_scraped_at_fiat_idx
  ON ads (scraped_at, fiat, trade_type);

-- Hourly rollup without pay_type dimension.
-- Used by price/spread/heatmap queries when no payType filter is active.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ads_hourly AS
SELECT
  date_trunc('hour', scraped_at) AS hour_bucket,
  fiat,
  asset,
  trade_type,
  MIN(price)               AS min_price,
  MAX(price)               AS max_price,
  SUM(price)               AS sum_price,
  SUM(tradable_quantity)   AS total_volume,
  COUNT(*)                 AS ad_count
FROM ads
GROUP BY 1, 2, 3, 4;

CREATE UNIQUE INDEX IF NOT EXISTS mv_ads_hourly_uidx
  ON mv_ads_hourly (hour_bucket, fiat, asset, trade_type);

-- Hourly rollup with pay_type dimension.
-- Used when a payType filter is active. Never sum across pay_type here:
-- ads with multiple payment methods appear once per pay_type.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ads_hourly_by_pay AS
SELECT
  date_trunc('hour', a.scraped_at) AS hour_bucket,
  a.fiat,
  a.asset,
  a.trade_type,
  apm.pay_type,
  MIN(a.price)             AS min_price,
  MAX(a.price)             AS max_price,
  SUM(a.price)             AS sum_price,
  SUM(a.tradable_quantity) AS total_volume,
  COUNT(*)                 AS ad_count
FROM ads a
JOIN ad_payment_methods apm ON apm.ad_id = a.id
GROUP BY 1, 2, 3, 4, 5;

CREATE UNIQUE INDEX IF NOT EXISTS mv_ads_hourly_by_pay_uidx
  ON mv_ads_hourly_by_pay (hour_bucket, fiat, asset, trade_type, pay_type);
