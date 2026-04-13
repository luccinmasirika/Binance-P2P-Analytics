import { db } from "../db/client";
import { forexRates } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

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

function pickMatview(payType?: string) {
  if (payType) {
    return {
      name: sql.raw("mv_ads_hourly_by_pay"),
      payFilter: sql`AND pay_type = ${payType}`,
    };
  }
  return {
    name: sql.raw("mv_ads_hourly"),
    payFilter: sql``,
  };
}

function bucketExprFromHour(granularity: string): string {
  switch (granularity) {
    case "hour":
      return "hour_bucket";
    case "12h":
      return "hour_bucket - (EXTRACT(HOUR FROM hour_bucket)::int % 12) * INTERVAL '1 hour'";
    case "day":
      return "date_trunc('day', hour_bucket)";
    case "week":
      return "date_trunc('week', hour_bucket)";
    default:
      return "hour_bucket";
  }
}

function periodToInterval(period: string): string {
  return period === "7d" ? "7 days" : period === "30d" ? "30 days" : "24 hours";
}

export async function getPriceHistory(period: string = "24h", fiat: string = "RWF", payType?: string, granularity: string = "hour") {
  const interval = periodToInterval(period);
  const mv = pickMatview(payType);
  const bucketExpr = bucketExprFromHour(granularity);

  const result = await db.execute(sql`
    SELECT
      ${sql.raw(bucketExpr)} AS time_bucket,
      trade_type,
      MIN(min_price) FILTER (WHERE trade_type = 'BUY') AS best_buy,
      MAX(max_price) FILTER (WHERE trade_type = 'SELL') AS best_sell,
      SUM(sum_price) / NULLIF(SUM(ad_count), 0) AS avg_price,
      SUM(total_volume) AS total_volume,
      SUM(ad_count)::int AS ad_count
    FROM ${mv.name}
    WHERE fiat = ${fiat}
      AND hour_bucket > NOW() - INTERVAL '${sql.raw(interval)}'
      ${mv.payFilter}
    GROUP BY time_bucket, trade_type
    ORDER BY time_bucket ASC
  `);

  return result.rows;
}

export async function getSpreadHistory(period: string = "24h", fiat: string = "RWF", payType?: string, granularity: string = "hour") {
  const interval = periodToInterval(period);
  const mv = pickMatview(payType);
  const bucketExpr = bucketExprFromHour(granularity);

  const result = await db.execute(sql`
    WITH bucketed AS (
      SELECT
        ${sql.raw(bucketExpr)} AS time_bucket,
        MIN(min_price) FILTER (WHERE trade_type = 'BUY') AS best_buy,
        MAX(max_price) FILTER (WHERE trade_type = 'SELL') AS best_sell
      FROM ${mv.name}
      WHERE fiat = ${fiat}
        AND hour_bucket > NOW() - INTERVAL '${sql.raw(interval)}'
        ${mv.payFilter}
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
  const mv = pickMatview(payType);

  const result = await db.execute(sql`
    WITH bucketed AS (
      SELECT
        hour_bucket,
        MIN(min_price) FILTER (WHERE trade_type = 'BUY') AS best_buy,
        MAX(max_price) FILTER (WHERE trade_type = 'SELL') AS best_sell
      FROM ${mv.name}
      WHERE fiat = ${fiat}
        AND hour_bucket > NOW() - INTERVAL '30 days'
        ${mv.payFilter}
      GROUP BY hour_bucket
    )
    SELECT
      EXTRACT(DOW FROM hour_bucket) AS day_of_week,
      EXTRACT(HOUR FROM hour_bucket) AS hour_of_day,
      AVG(best_sell - best_buy) AS avg_spread,
      COUNT(*) AS sample_count
    FROM bucketed
    WHERE best_buy IS NOT NULL AND best_sell IS NOT NULL
    GROUP BY day_of_week, hour_of_day
    ORDER BY day_of_week, hour_of_day
  `);

  return result.rows;
}
