import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  scrapeSessions,
  advertisers,
  advertiserSnapshots,
  ads,
  adPaymentMethods,
  forexRates,
  marketDepthSnapshots,
  countries,
} from "../db/schema";
import { fetchAllAds } from "./binance";
import { fetchForexRate } from "./forex";
import { checkAlerts } from "../alerts/telegram";
import type { AdItem } from "./types";

export async function runFullScrape() {
  console.log(`[${new Date().toISOString()}] Starting full scrape...`);

  // Get all active countries, seeding a default Rwanda row on first-ever run
  let activeCountries = await db
    .select()
    .from(countries)
    .where(eq(countries.isActive, true));

  if (activeCountries.length === 0) {
    console.log("  No active countries configured. Seeding default (Rwanda)...");
    await db
      .insert(countries)
      .values({
        fiat: "RWF",
        name: "Rwanda",
        currencySymbol: "Fr",
        isActive: true,
      })
      .onConflictDoNothing();

    activeCountries = await db
      .select()
      .from(countries)
      .where(eq(countries.isActive, true));

    if (activeCountries.length === 0) {
      console.log("  Seed failed. Skipping scrape.");
      return;
    }
  }

  // Mark any orphaned 'running' sessions from previous crashed runs as failed.
  // Otherwise they linger forever and skew "is the scraper alive?" heuristics.
  await db.execute(sql`
    UPDATE scrape_sessions
    SET status = 'failed', finished_at = NOW()
    WHERE status = 'running' AND started_at < NOW() - INTERVAL '15 minutes'
  `);

  // 1. Create session
  const [session] = await db
    .insert(scrapeSessions)
    .values({ status: "running" })
    .returning();

  try {
    let totalAds = 0;

    for (const country of activeCountries) {
      console.log(`  Scraping ${country.name} (${country.fiat})...`);
      const seenAdvNos = new Set<string>();
      const snapshottedAdvertiserIds = new Set<number>();

      // 2. Scrape Binance P2P for BUY and SELL with all allowed payment methods
      for (const tradeType of ["BUY", "SELL"] as const) {
        const countryPayTypes = country.payTypes ?? [];
        console.log(`    Fetching ${tradeType} ads for ${country.fiat}...`);
        const items = await fetchAllAds(country.fiat, tradeType, countryPayTypes);
        console.log(`    Found ${items.length} ${tradeType} ads`);

        for (const item of items) {
          if (seenAdvNos.has(item.adv.advNo)) continue;
          seenAdvNos.add(item.adv.advNo);

          await insertAd(
            session.id,
            country.fiat,
            tradeType,
            item,
            countryPayTypes,
            snapshottedAdvertiserIds
          );
          totalAds++;
        }
      }

      // 3. Compute market depth snapshots for this country
      await computeDepthSnapshots(session.id, country.fiat);

      // 4. Fetch forex rate for this country
      try {
        const forex = await fetchForexRate(country.fiat);
        await db.insert(forexRates).values({
          base: forex.base,
          target: forex.target,
          rate: String(forex.rate),
          source: forex.source,
        });
        console.log(`    USD/${country.fiat} rate: ${forex.rate}`);
      } catch (err) {
        console.error(`    Failed to fetch forex rate for ${country.fiat}:`, err);
      }
    }

    // 5. Check alerts
    console.log("  Checking alerts...");
    try {
      await checkAlerts();
    } catch (err) {
      console.error("  Failed to check alerts:", err);
    }

    // 6. Update session
    await db
      .update(scrapeSessions)
      .set({
        status: "completed",
        totalAds,
        finishedAt: new Date(),
      })
      .where(eq(scrapeSessions.id, session.id));

    // 7. Refresh materialized views (non-blocking: failures are logged, not thrown)
    await refreshMatviews();

    console.log(`[${new Date().toISOString()}] Scrape completed: ${totalAds} ads`);
  } catch (err) {
    await db
      .update(scrapeSessions)
      .set({ status: "failed", finishedAt: new Date() })
      .where(eq(scrapeSessions.id, session.id));

    console.error(`[${new Date().toISOString()}] Scrape failed:`, err);
    throw err;
  }
}

async function refreshMatviews() {
  const views = ["mv_ads_hourly", "mv_ads_hourly_by_pay"] as const;
  const results = await Promise.allSettled(
    views.map(async (view) => {
      const start = Date.now();
      await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`));
      return { view, ms: Date.now() - start };
    })
  );
  for (const [i, r] of results.entries()) {
    if (r.status === "fulfilled") {
      console.log(`  mv refresh: ${r.value.view} ${r.value.ms}ms`);
    } else {
      console.error(`  mv refresh failed: ${views[i]}:`, r.reason);
    }
  }
}

async function insertAd(
  sessionId: number,
  fiat: string,
  tradeType: "BUY" | "SELL",
  item: AdItem,
  allowedPayTypes: string[],
  snapshottedAdvertiserIds: Set<number>
) {
  const { adv, advertiser: adv_advertiser } = item;

  // Check payment methods BEFORE inserting — skip ads with no matching methods
  const allowedSet = new Set(allowedPayTypes);
  const filteredMethods = allowedPayTypes.length > 0
    ? adv.tradeMethods.filter((m) => m.identifier && allowedSet.has(m.identifier))
    : adv.tradeMethods.filter((m) => m.identifier);

  if (filteredMethods.length === 0) return;

  // Upsert advertiser
  const [advertiser] = await db
    .insert(advertisers)
    .values({
      userNo: adv_advertiser.userNo,
      nickname: adv_advertiser.nickName,
      monthlyOrderCount: adv_advertiser.monthOrderCount,
      monthlyFinishRate: String(adv_advertiser.monthFinishRate),
      positiveRate: String(adv_advertiser.positiveRate),
      userType: adv_advertiser.userType,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: advertisers.userNo,
      set: {
        nickname: adv_advertiser.nickName,
        monthlyOrderCount: adv_advertiser.monthOrderCount,
        monthlyFinishRate: String(adv_advertiser.monthFinishRate),
        positiveRate: String(adv_advertiser.positiveRate),
        userType: adv_advertiser.userType,
        lastSeenAt: new Date(),
      },
    })
    .returning();

  // Insert advertiser snapshot once per session per advertiser
  if (!snapshottedAdvertiserIds.has(advertiser.id)) {
    snapshottedAdvertiserIds.add(advertiser.id);
    await db.insert(advertiserSnapshots).values({
      sessionId,
      advertiserId: advertiser.id,
      monthOrderCount: adv_advertiser.monthOrderCount,
      monthFinishRate: String(adv_advertiser.monthFinishRate),
      positiveRate: String(adv_advertiser.positiveRate),
      isOnline: adv_advertiser.isOnline ?? null,
    });
  }

  // Insert ad
  const [ad] = await db
    .insert(ads)
    .values({
      sessionId,
      fiat,
      advNo: adv.advNo,
      tradeType,
      asset: adv.asset,
      price: String(adv.price),
      surplusAmount: String(adv.surplusAmount),
      minAmount: String(adv.minSingleTransAmount),
      maxAmount: String(adv.maxSingleTransAmount),
      tradableQuantity: String(adv.tradableQuantity),
      payTimeLimit: adv.payTimeLimit,
      advertiserId: advertiser.id,
    })
    .returning();

  // Insert payment methods
  await db.insert(adPaymentMethods).values(
    filteredMethods.map((m) => ({
      adId: ad.id,
      payType: m.identifier,
      payMethodName: m.tradeMethodName,
    }))
  );
}

async function computeDepthSnapshots(sessionId: number, fiat: string) {
  const depthData = await db
    .select({
      tradeType: ads.tradeType,
      price: ads.price,
      totalQuantity: sql<string>`SUM(CAST(${ads.tradableQuantity} AS numeric))`,
      adCount: sql<number>`COUNT(*)::int`,
    })
    .from(ads)
    .where(and(eq(ads.sessionId, sessionId), eq(ads.fiat, fiat)))
    .groupBy(ads.tradeType, ads.price);

  if (depthData.length > 0) {
    await db.insert(marketDepthSnapshots).values(
      depthData.map((d) => ({
        sessionId,
        fiat,
        tradeType: d.tradeType,
        priceLevel: d.price,
        totalQuantity: d.totalQuantity,
        adCount: d.adCount,
        payType: null,
      }))
    );
  }

  const depthByPay = await db
    .select({
      tradeType: ads.tradeType,
      price: ads.price,
      payType: adPaymentMethods.payType,
      totalQuantity: sql<string>`SUM(CAST(${ads.tradableQuantity} AS numeric))`,
      adCount: sql<number>`COUNT(*)::int`,
    })
    .from(ads)
    .innerJoin(adPaymentMethods, eq(ads.id, adPaymentMethods.adId))
    .where(and(eq(ads.sessionId, sessionId), eq(ads.fiat, fiat)))
    .groupBy(ads.tradeType, ads.price, adPaymentMethods.payType);

  if (depthByPay.length > 0) {
    await db.insert(marketDepthSnapshots).values(
      depthByPay.map((d) => ({
        sessionId,
        fiat,
        tradeType: d.tradeType,
        priceLevel: d.price,
        totalQuantity: d.totalQuantity,
        adCount: d.adCount,
        payType: d.payType,
      }))
    );
  }
}
