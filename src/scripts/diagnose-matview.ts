import { sql } from "drizzle-orm";
import { db } from "../lib/db/client";

async function main() {
  console.log("--- 1. Matviews existence ---");
  const mv = await db.execute(sql`
    SELECT matviewname FROM pg_matviews
    WHERE matviewname IN ('mv_ads_hourly','mv_ads_hourly_by_pay')
  `);
  console.log(mv.rows);

  console.log("\n--- 2. KES rows in mv_ads_hourly (if exists) ---");
  try {
    const kesMv = await db.execute(sql`
      SELECT fiat, COUNT(*)::int AS rows, MIN(hour_bucket) AS min_bucket, MAX(hour_bucket) AS max_bucket
      FROM mv_ads_hourly
      WHERE fiat = 'KES'
      GROUP BY fiat
    `);
    console.log(kesMv.rows);
  } catch (err) {
    console.error("mv_ads_hourly query failed:", (err as Error).message);
  }

  console.log("\n--- 3. KES raw ads last 24h ---");
  const rawAds = await db.execute(sql`
    SELECT COUNT(*)::int AS rows, MIN(scraped_at) AS min_ts, MAX(scraped_at) AS max_ts
    FROM ads
    WHERE fiat = 'KES' AND scraped_at > NOW() - INTERVAL '24 hours'
  `);
  console.log(rawAds.rows);

  console.log("\n--- 4. All fiats in mv_ads_hourly (with latest hour_bucket) ---");
  try {
    const fiats = await db.execute(sql`
      SELECT fiat, COUNT(*)::int AS rows, MIN(hour_bucket) AS min_bucket, MAX(hour_bucket) AS max_bucket
      FROM mv_ads_hourly
      GROUP BY fiat ORDER BY max_bucket DESC
    `);
    console.log(fiats.rows);
  } catch (err) {
    console.error("mv_ads_hourly fiats query failed:", (err as Error).message);
  }

  console.log("\n--- 5. Latest scrape_sessions ---");
  const sessions = await db.execute(sql`
    SELECT id, status, started_at, finished_at, total_ads
    FROM scrape_sessions
    ORDER BY id DESC
    LIMIT 10
  `);
  console.log(sessions.rows);

  console.log("\n--- 6. Ads per fiat in latest completed session ---");
  const latestSession = await db.execute(sql`
    SELECT fiat, COUNT(*)::int AS count
    FROM ads
    WHERE session_id = (SELECT MAX(id) FROM scrape_sessions WHERE status='completed')
    GROUP BY fiat
    ORDER BY count DESC
  `);
  console.log(latestSession.rows);

  console.log("\n--- 7. Current DB NOW() ---");
  const now = await db.execute(sql`SELECT NOW() AS now`);
  console.log(now.rows);

  console.log("\n--- 8. Raw ads per fiat last 24h ---");
  const adsByFiat = await db.execute(sql`
    SELECT fiat, COUNT(*)::int AS count, MAX(scraped_at) AS latest
    FROM ads
    WHERE scraped_at > NOW() - INTERVAL '24 hours'
    GROUP BY fiat
    ORDER BY latest DESC
  `);
  console.log(adsByFiat.rows);

  process.exit(0);
}

main().catch((err) => {
  console.error("diagnose failed:", err);
  process.exit(1);
});
