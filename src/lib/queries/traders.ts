import { db } from "../db/client";
import { ads, advertisers } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function getTopTraders(limit: number = 20) {
  const result = await db.execute(sql`
    SELECT
      a.id,
      a.user_no,
      a.nickname,
      a.monthly_order_count,
      a.monthly_finish_rate,
      a.positive_rate,
      a.user_type,
      a.first_seen_at,
      a.last_seen_at,
      COUNT(DISTINCT ad.id) AS total_ads,
      COUNT(DISTINCT ad.session_id) AS sessions_present,
      AVG(CAST(ad.price AS numeric)) FILTER (WHERE ad.trade_type = 'BUY') AS avg_buy_price,
      AVG(CAST(ad.price AS numeric)) FILTER (WHERE ad.trade_type = 'SELL') AS avg_sell_price
    FROM advertisers a
    INNER JOIN ads ad ON ad.advertiser_id = a.id
    WHERE ad.scraped_at > NOW() - INTERVAL '7 days'
    GROUP BY a.id
    ORDER BY total_ads DESC
    LIMIT ${limit}
  `);

  return result.rows;
}

export async function getTraderProfile(userNo: string) {
  const [trader] = await db
    .select()
    .from(advertisers)
    .where(eq(advertisers.userNo, userNo))
    .limit(1);

  if (!trader) return null;

  const adHistory = await db.execute(sql`
    SELECT
      ad.trade_type,
      CAST(ad.price AS numeric) AS price,
      ad.scraped_at,
      CAST(ad.tradable_quantity AS numeric) AS quantity,
      CAST(ad.min_amount AS numeric) AS min_amount,
      CAST(ad.max_amount AS numeric) AS max_amount
    FROM ads ad
    WHERE ad.advertiser_id = ${trader.id}
      AND ad.scraped_at > NOW() - INTERVAL '30 days'
    ORDER BY ad.scraped_at DESC
    LIMIT 500
  `);

  return { trader, adHistory: adHistory.rows };
}

export async function getTraderHourlyPatterns(userNo: string) {
  const [trader] = await db
    .select()
    .from(advertisers)
    .where(eq(advertisers.userNo, userNo))
    .limit(1);

  if (!trader) return null;

  const result = await db.execute(sql`
    SELECT
      EXTRACT(HOUR FROM ad.scraped_at) AS hour_of_day,
      EXTRACT(DOW FROM ad.scraped_at) AS day_of_week,
      COUNT(*) AS presence_count,
      AVG(CAST(ad.price AS numeric)) AS avg_price
    FROM ads ad
    WHERE ad.advertiser_id = ${trader.id}
      AND ad.scraped_at > NOW() - INTERVAL '30 days'
    GROUP BY hour_of_day, day_of_week
    ORDER BY hour_of_day
  `);

  return result.rows;
}

export async function getMarketMakers() {
  const result = await db.execute(sql`
    WITH total_sessions AS (
      SELECT COUNT(DISTINCT session_id) AS total FROM ads
      WHERE scraped_at > NOW() - INTERVAL '7 days'
    ),
    trader_presence AS (
      SELECT
        a.id, a.user_no, a.nickname, a.user_type,
        a.monthly_order_count, a.monthly_finish_rate, a.positive_rate,
        COUNT(DISTINCT ad.session_id) AS sessions_present
      FROM advertisers a
      INNER JOIN ads ad ON ad.advertiser_id = a.id
      WHERE ad.scraped_at > NOW() - INTERVAL '7 days'
      GROUP BY a.id
    )
    SELECT
      tp.*,
      ts.total AS total_sessions,
      ROUND(tp.sessions_present::numeric / NULLIF(ts.total, 0) * 100, 1) AS presence_pct
    FROM trader_presence tp, total_sessions ts
    WHERE tp.sessions_present::numeric / NULLIF(ts.total, 0) > 0.8
    ORDER BY presence_pct DESC
  `);

  return result.rows;
}
