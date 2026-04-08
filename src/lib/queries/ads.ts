import { db } from "../db/client";
import { ads, adPaymentMethods, advertisers } from "../db/schema";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";

export interface AdsFilter {
  fiat?: string;
  tradeType?: "BUY" | "SELL";
  payType?: string;
  period?: "24h" | "7d" | "30d";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export function periodToInterval(period: string): string {
  switch (period) {
    case "24h": return "24 hours";
    case "7d": return "7 days";
    case "30d": return "30 days";
    default: return "24 hours";
  }
}

export async function getRecentAds(filter: AdsFilter = {}) {
  const conditions = [];

  if (filter.fiat) {
    conditions.push(eq(ads.fiat, filter.fiat));
  }

  if (filter.tradeType) {
    conditions.push(eq(ads.tradeType, filter.tradeType));
  }

  if (filter.period) {
    conditions.push(
      sql`${ads.scrapedAt} > NOW() - INTERVAL '${sql.raw(periodToInterval(filter.period))}'`
    );
  }

  if (filter.startDate) {
    conditions.push(gte(ads.scrapedAt, filter.startDate));
  }

  if (filter.endDate) {
    conditions.push(lte(ads.scrapedAt, filter.endDate));
  }

  if (filter.payType) {
    conditions.push(
      sql`${ads.id} IN (SELECT ad_id FROM ad_payment_methods WHERE pay_type = ${filter.payType})`
    );
  }

  const query = db
    .select({
      id: ads.id,
      advNo: ads.advNo,
      tradeType: ads.tradeType,
      price: ads.price,
      surplusAmount: ads.surplusAmount,
      minAmount: ads.minAmount,
      maxAmount: ads.maxAmount,
      tradableQuantity: ads.tradableQuantity,
      payTimeLimit: ads.payTimeLimit,
      scrapedAt: ads.scrapedAt,
      advertiserNickname: advertisers.nickname,
      advertiserUserNo: advertisers.userNo,
      advertiserMonthlyOrders: advertisers.monthlyOrderCount,
      advertiserFinishRate: advertisers.monthlyFinishRate,
    })
    .from(ads)
    .innerJoin(advertisers, eq(ads.advertiserId, advertisers.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ads.scrapedAt), ads.tradeType, ads.price)
    .limit(filter.limit ?? 50)
    .offset(filter.offset ?? 0);

  return query;
}

export async function getAdPaymentMethods(adIds: number[]) {
  if (adIds.length === 0) return [];
  return db
    .select()
    .from(adPaymentMethods)
    .where(inArray(adPaymentMethods.adId, adIds));
}

export async function getDistinctPaymentMethods() {
  const result = await db
    .selectDistinct({ payType: adPaymentMethods.payType, payMethodName: adPaymentMethods.payMethodName })
    .from(adPaymentMethods)
    .orderBy(adPaymentMethods.payType);
  return result;
}
