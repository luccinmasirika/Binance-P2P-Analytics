import { db } from "../db/client";
import { marketDepthSnapshots } from "../db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

export async function getLatestDepth(tradeType?: "BUY" | "SELL") {
  const conditions = [
    isNull(marketDepthSnapshots.payType),
    sql`${marketDepthSnapshots.sessionId} = (
      SELECT MAX(id) FROM scrape_sessions WHERE status = 'completed'
    )`,
  ];

  if (tradeType) {
    conditions.push(eq(marketDepthSnapshots.tradeType, tradeType));
  }

  return db
    .select()
    .from(marketDepthSnapshots)
    .where(and(...conditions))
    .orderBy(marketDepthSnapshots.priceLevel);
}

export async function getDepthByPaymentMethod() {
  const result = await db.execute(sql`
    SELECT
      trade_type,
      pay_type,
      SUM(CAST(total_quantity AS numeric)) AS total_volume,
      SUM(ad_count) AS total_ads
    FROM market_depth_snapshots
    WHERE session_id = (
        SELECT MAX(id) FROM scrape_sessions WHERE status = 'completed'
      )
      AND pay_type IS NOT NULL
    GROUP BY trade_type, pay_type
    ORDER BY total_volume DESC
  `);

  return result.rows;
}

export async function getDepthComparison(period: "24h" | "7d" = "24h") {
  const interval = period === "7d" ? "7 days" : "24 hours";

  const result = await db.execute(sql`
    WITH current AS (
      SELECT trade_type, SUM(CAST(total_quantity AS numeric)) AS volume
      FROM market_depth_snapshots
      WHERE session_id = (
          SELECT MAX(id) FROM scrape_sessions WHERE status = 'completed'
        )
        AND pay_type IS NULL
      GROUP BY trade_type
    ),
    past AS (
      SELECT trade_type, AVG(vol) AS volume FROM (
        SELECT trade_type, date_trunc('hour', scraped_at) AS bucket,
          SUM(CAST(total_quantity AS numeric)) AS vol
        FROM market_depth_snapshots
        WHERE scraped_at BETWEEN NOW() - INTERVAL '${sql.raw(interval)}' - INTERVAL '1 hour'
          AND NOW() - INTERVAL '${sql.raw(interval)}'
          AND pay_type IS NULL
        GROUP BY trade_type, bucket
      ) sub
      GROUP BY trade_type
    )
    SELECT
      c.trade_type,
      c.volume AS current_volume,
      p.volume AS past_volume,
      CASE WHEN p.volume > 0 THEN ((c.volume - p.volume) / p.volume * 100) ELSE NULL END AS change_pct
    FROM current c
    LEFT JOIN past p ON c.trade_type = p.trade_type
  `);

  return result.rows;
}
