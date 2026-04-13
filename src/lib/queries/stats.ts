import { db } from "../db/client";
import { forexRates } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { calculateSendFee, calculateReceiveFee } from "../constants/fees";

function payTypeJoin(payType?: string) {
  if (!payType) return { join: sql``, where: sql`` };
  return {
    join: sql`INNER JOIN ad_payment_methods apm ON apm.ad_id = ads.id`,
    where: sql`AND apm.pay_type = ${payType}`,
  };
}

interface LatestAdRow {
  trade_type: string;
  price: string;
  min_amount: string | null;
  tradable_quantity: string | null;
  primary_pay_type: string | null;
}

export async function getCurrentStats(fiat: string = "RWF", payType?: string) {
  // Fetch every ad of the latest completed session along with the relevant
  // pay_type (filtered by user choice, or the ad's first pay_type otherwise).
  // Aggregation is done in JS so we can apply tiered fees per ad.
  const adsResult = await db.execute(sql`
    SELECT
      a.trade_type,
      a.price::numeric AS price,
      a.min_amount::numeric AS min_amount,
      a.tradable_quantity::numeric AS tradable_quantity,
      (
        SELECT apm.pay_type
        FROM ad_payment_methods apm
        WHERE apm.ad_id = a.id
          ${payType ? sql`AND apm.pay_type = ${payType}` : sql``}
        ORDER BY apm.id ASC
        LIMIT 1
      ) AS primary_pay_type
    FROM ads a
    WHERE a.fiat = ${fiat}
      AND a.session_id = (
        SELECT MAX(id) FROM scrape_sessions WHERE status = 'completed'
      )
      ${payType ? sql`AND EXISTS (SELECT 1 FROM ad_payment_methods x WHERE x.ad_id = a.id AND x.pay_type = ${payType})` : sql``}
  `);

  const ads = adsResult.rows as unknown as LatestAdRow[];

  let bestBuyPrice: number | null = null;
  let bestSellPrice: number | null = null;
  let buyAdCount = 0;
  let sellAdCount = 0;
  let buyVolume = 0;
  let sellVolume = 0;
  let bestEffectiveBuyCost: number | null = null;
  let bestEffectiveSellRevenue: number | null = null;

  for (const ad of ads) {
    const price = Number(ad.price);
    const minAmount = ad.min_amount ? Number(ad.min_amount) : 0;
    const volume = ad.tradable_quantity ? Number(ad.tradable_quantity) : 0;

    if (ad.trade_type === "BUY") {
      // BUY-type ad in Binance P2P = ad you can BUY against (counterparty
      // is selling USDT). To trade, you SEND RWF → pay send fee.
      buyAdCount++;
      buyVolume += volume;
      if (bestBuyPrice === null || price < bestBuyPrice) bestBuyPrice = price;

      if (minAmount > 0) {
        const sendFee = calculateSendFee(ad.primary_pay_type, minAmount);
        const effectiveCost = price * (1 + sendFee / minAmount);
        if (bestEffectiveBuyCost === null || effectiveCost < bestEffectiveBuyCost) {
          bestEffectiveBuyCost = effectiveCost;
        }
      }
    } else if (ad.trade_type === "SELL") {
      // SELL-type ad = ad you can SELL against (counterparty is buying
      // USDT). You RECEIVE RWF → pay cash-out fee on withdrawal.
      sellAdCount++;
      sellVolume += volume;
      if (bestSellPrice === null || price > bestSellPrice) bestSellPrice = price;

      if (minAmount > 0) {
        const receiveFee = calculateReceiveFee(ad.primary_pay_type, minAmount);
        const effectiveRevenue = price * (1 - receiveFee / minAmount);
        if (bestEffectiveSellRevenue === null || effectiveRevenue > bestEffectiveSellRevenue) {
          bestEffectiveSellRevenue = effectiveRevenue;
        }
      }
    }
  }

  const [latestForex] = await db
    .select()
    .from(forexRates)
    .where(eq(forexRates.target, fiat))
    .orderBy(desc(forexRates.fetchedAt))
    .limit(1);

  const spread =
    bestBuyPrice !== null && bestSellPrice !== null ? bestSellPrice - bestBuyPrice : null;
  const forexRate = latestForex ? Number(latestForex.rate) : null;
  const p2pPremium =
    bestBuyPrice !== null && forexRate ? (bestBuyPrice / forexRate - 1) * 100 : null;

  const effectiveSpread =
    bestEffectiveBuyCost !== null && bestEffectiveSellRevenue !== null
      ? bestEffectiveSellRevenue - bestEffectiveBuyCost
      : null;
  const effectiveP2pPremium =
    bestEffectiveBuyCost !== null && forexRate
      ? (bestEffectiveBuyCost / forexRate - 1) * 100
      : null;

  return {
    bestBuyPrice,
    bestSellPrice,
    spread,
    buyAdCount,
    sellAdCount,
    buyVolume,
    sellVolume,
    forexRate,
    p2pPremium,
    effectiveBuyCost: bestEffectiveBuyCost,
    effectiveSellRevenue: bestEffectiveSellRevenue,
    effectiveSpread,
    effectiveP2pPremium,
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
    case "1h":
      return "hour_bucket";
    case "4h":
      return "date_trunc('hour', hour_bucket) - (EXTRACT(HOUR FROM hour_bucket)::int % 4) * INTERVAL '1 hour'";
    case "1D":
      return "date_trunc('day', hour_bucket)";
    case "1W":
      return "date_trunc('week', hour_bucket)";
    default:
      return "hour_bucket";
  }
}

// 15min bucket expression over raw ads.scraped_at (matview is hourly, so 15min bypasses it).
const BUCKET_EXPR_15MIN =
  "date_trunc('hour', ads.scraped_at) + (EXTRACT(MINUTE FROM ads.scraped_at)::int / 15) * INTERVAL '15 minutes'";

function periodToInterval(period: string): string {
  return period === "7d" ? "7 days" : period === "30d" ? "30 days" : "24 hours";
}

export async function getPriceHistory(period: string = "24h", fiat: string = "RWF", payType?: string, granularity: string = "1h") {
  const interval = periodToInterval(period);

  if (granularity === "15min") {
    const pm = payTypeJoin(payType);
    const result = await db.execute(sql`
      SELECT
        ${sql.raw(BUCKET_EXPR_15MIN)} AS time_bucket,
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

export async function getSpreadHistory(period: string = "24h", fiat: string = "RWF", payType?: string, granularity: string = "1h") {
  const interval = periodToInterval(period);

  if (granularity === "15min") {
    const pm = payTypeJoin(payType);
    const result = await db.execute(sql`
      WITH bucketed AS (
        SELECT
          ${sql.raw(BUCKET_EXPR_15MIN)} AS time_bucket,
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

function heatmapHourExpr(granularity: string): string {
  switch (granularity) {
    case "4h":
      return "(EXTRACT(HOUR FROM hour_bucket)::int / 4)";
    case "1D":
    case "1W":
      return "0";
    default:
      return "EXTRACT(HOUR FROM hour_bucket)::int";
  }
}

export async function getHeatmapData(fiat: string = "RWF", payType?: string, granularity: string = "1h") {
  if (granularity === "15min") {
    const pm = payTypeJoin(payType);
    const result = await db.execute(sql`
      WITH bucketed AS (
        SELECT
          ${sql.raw(BUCKET_EXPR_15MIN)} AS ts,
          MIN(CAST(ads.price AS numeric)) FILTER (WHERE ads.trade_type = 'BUY') AS best_buy,
          MAX(CAST(ads.price AS numeric)) FILTER (WHERE ads.trade_type = 'SELL') AS best_sell
        FROM ads
        ${pm.join}
        WHERE ads.fiat = ${fiat}
          AND ads.scraped_at > NOW() - INTERVAL '30 days'
          ${pm.where}
        GROUP BY ts
      )
      SELECT
        EXTRACT(DOW FROM ts)::int AS day_of_week,
        (EXTRACT(HOUR FROM ts)::int * 4 + EXTRACT(MINUTE FROM ts)::int / 15) AS hour_of_day,
        AVG(best_sell - best_buy) AS avg_spread,
        COUNT(*) AS sample_count
      FROM bucketed
      WHERE best_buy IS NOT NULL AND best_sell IS NOT NULL
      GROUP BY day_of_week, hour_of_day
      ORDER BY day_of_week, hour_of_day
    `);
    return result.rows;
  }

  const mv = pickMatview(payType);
  const hourExpr = heatmapHourExpr(granularity);

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
      EXTRACT(DOW FROM hour_bucket)::int AS day_of_week,
      ${sql.raw(hourExpr)} AS hour_of_day,
      AVG(best_sell - best_buy) AS avg_spread,
      COUNT(*) AS sample_count
    FROM bucketed
    WHERE best_buy IS NOT NULL AND best_sell IS NOT NULL
    GROUP BY day_of_week, hour_of_day
    ORDER BY day_of_week, hour_of_day
  `);

  return result.rows;
}
