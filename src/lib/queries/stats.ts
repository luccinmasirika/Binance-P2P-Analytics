import { db } from "../db/client";
import { ads, adPaymentMethods, forexRates } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

function payTypeJoin(payType?: string) {
  if (!payType) return { join: sql``, where: sql`` };
  return {
    join: sql`INNER JOIN ad_payment_methods apm ON apm.ad_id = ads.id`,
    where: sql`AND apm.pay_type = ${payType}`,
  };
}

export async function getCurrentStats(fiat: string = "RWF", payType?: string) {
  const pm = payTypeJoin(payType);

  const result = await db.execute(sql`
    SELECT
      MIN(CAST(price AS numeric)) FILTER (WHERE trade_type = 'BUY') AS best_buy_price,
      MAX(CAST(price AS numeric)) FILTER (WHERE trade_type = 'SELL') AS best_sell_price,
      COUNT(*) FILTER (WHERE trade_type = 'BUY')::int AS buy_ad_count,
      COUNT(*) FILTER (WHERE trade_type = 'SELL')::int AS sell_ad_count,
      SUM(CAST(tradable_quantity AS numeric)) FILTER (WHERE trade_type = 'BUY') AS buy_volume,
      SUM(CAST(tradable_quantity AS numeric)) FILTER (WHERE trade_type = 'SELL') AS sell_volume
    FROM ads
    ${pm.join}
    WHERE ads.fiat = ${fiat}
      AND ads.session_id = (
        SELECT MAX(id) FROM scrape_sessions WHERE status = 'completed'
      )
      ${pm.where}
  `);

  const row = result.rows[0] as any;

  const [latestForex] = await db
    .select()
    .from(forexRates)
    .where(eq(forexRates.target, fiat))
    .orderBy(desc(forexRates.fetchedAt))
    .limit(1);

  const buyPrice = row?.best_buy_price ? Number(row.best_buy_price) : null;
  const sellPrice = row?.best_sell_price ? Number(row.best_sell_price) : null;
  const spread = buyPrice && sellPrice ? sellPrice - buyPrice : null;
  const forexRate = latestForex ? Number(latestForex.rate) : null;
  const p2pPremium =
    buyPrice && forexRate ? ((buyPrice / forexRate - 1) * 100) : null;

  return {
    bestBuyPrice: buyPrice,
    bestSellPrice: sellPrice,
    spread,
    buyAdCount: row?.buy_ad_count ?? 0,
    sellAdCount: row?.sell_ad_count ?? 0,
    buyVolume: row?.buy_volume ? Number(row.buy_volume) : 0,
    sellVolume: row?.sell_volume ? Number(row.sell_volume) : 0,
    forexRate,
    p2pPremium,
  };
}

function granularityToBucket(granularity: string): { trunc: string; extra: string } {
  switch (granularity) {
    case "hour": return { trunc: "hour", extra: "" };
    case "12h": return { trunc: "hour", extra: `- (EXTRACT(HOUR FROM ads.scraped_at)::int % 12) * INTERVAL '1 hour'` };
    case "day": return { trunc: "day", extra: "" };
    case "week": return { trunc: "week", extra: "" };
    default: return { trunc: "hour", extra: "" };
  }
}

export async function getPriceHistory(period: string = "24h", fiat: string = "RWF", payType?: string, granularity: string = "hour") {
  const interval = period === "7d" ? "7 days" : period === "30d" ? "30 days" : "24 hours";
  const pm = payTypeJoin(payType);
  const g = granularityToBucket(granularity);
  const bucketExpr = g.extra
    ? `date_trunc('${g.trunc}', ads.scraped_at) ${g.extra}`
    : `date_trunc('${g.trunc}', ads.scraped_at)`;

  const result = await db.execute(sql`
    SELECT
      ${sql.raw(bucketExpr)} AS time_bucket,
      ads.trade_type AS trade_type,
      MIN(CAST(ads.price AS numeric)) FILTER (WHERE ads.trade_type = 'BUY') AS best_buy,
      MAX(CAST(ads.price AS numeric)) FILTER (WHERE ads.trade_type = 'SELL') AS best_sell,
      AVG(CAST(ads.price AS numeric)) AS avg_price,
      SUM(CAST(ads.tradable_quantity AS numeric)) AS total_volume,
      COUNT(*)::int AS ad_count
    FROM ads
    ${pm.join}
    WHERE ads.fiat = ${fiat}
      AND ads.scraped_at > NOW() - INTERVAL '${sql.raw(interval)}'
      ${pm.where}
    GROUP BY time_bucket, ads.trade_type
    ORDER BY time_bucket ASC
  `);

  return result.rows;
}

export async function getSpreadHistory(period: string = "24h", fiat: string = "RWF", payType?: string, granularity: string = "hour") {
  const interval = period === "7d" ? "7 days" : period === "30d" ? "30 days" : "24 hours";
  const pm = payTypeJoin(payType);
  const g = granularityToBucket(granularity);
  const bucketExpr = g.extra
    ? `date_trunc('${g.trunc}', ads.scraped_at) ${g.extra}`
    : `date_trunc('${g.trunc}', ads.scraped_at)`;

  const result = await db.execute(sql`
    WITH bucketed AS (
      SELECT
        ${sql.raw(bucketExpr)} AS time_bucket,
        MIN(CAST(ads.price AS numeric)) FILTER (WHERE ads.trade_type = 'BUY') AS best_buy,
        MAX(CAST(ads.price AS numeric)) FILTER (WHERE ads.trade_type = 'SELL') AS best_sell
      FROM ads
      ${pm.join}
      WHERE ads.fiat = ${fiat}
        AND ads.scraped_at > NOW() - INTERVAL '${sql.raw(interval)}'
        ${pm.where}
      GROUP BY time_bucket
    )
    SELECT
      time_bucket,
      best_buy,
      best_sell,
      best_sell - best_buy AS spread
    FROM bucketed
    WHERE best_buy IS NOT NULL AND best_sell IS NOT NULL
    ORDER BY time_bucket ASC
  `);

  return result.rows;
}

export async function getHeatmapData(fiat: string = "RWF", payType?: string) {
  const pm = payTypeJoin(payType);

  const result = await db.execute(sql`
    WITH bucketed AS (
      SELECT
        EXTRACT(DOW FROM ads.scraped_at) AS day_of_week,
        EXTRACT(HOUR FROM ads.scraped_at) AS hour_of_day,
        MIN(CAST(ads.price AS numeric)) FILTER (WHERE ads.trade_type = 'BUY') AS best_buy,
        MAX(CAST(ads.price AS numeric)) FILTER (WHERE ads.trade_type = 'SELL') AS best_sell
      FROM ads
      ${pm.join}
      WHERE ads.fiat = ${fiat}
        AND ads.scraped_at > NOW() - INTERVAL '30 days'
        ${pm.where}
      GROUP BY day_of_week, hour_of_day, date_trunc('hour', ads.scraped_at)
    )
    SELECT
      day_of_week,
      hour_of_day,
      AVG(best_sell - best_buy) AS avg_spread,
      COUNT(*) AS sample_count
    FROM bucketed
    WHERE best_buy IS NOT NULL AND best_sell IS NOT NULL
    GROUP BY day_of_week, hour_of_day
    ORDER BY day_of_week, hour_of_day
  `);

  return result.rows;
}
