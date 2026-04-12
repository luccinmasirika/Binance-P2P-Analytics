import { db } from "../db/client";
import { sql } from "drizzle-orm";
import { calculateFee } from "../constants/fees";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface FillInference {
  advNo: string;
  tradeType: "BUY" | "SELL";
  filledQuantity: number; // USDT
  price: number; // RWF/USDT
  fillValueRwf: number; // = filledQuantity × price
  scrapedAt: Date; // timestamp of the snapshot BEFORE the fill
  source: "decay" | "disappearance";
}

export interface TraderProfitEstimate {
  userNo: string;
  nickname: string;
  userType: string | null;
  monthlyOrderCount: number | null;
  usdtBought: number;
  usdtSold: number;
  rwfSpentBuying: number;
  rwfReceivedSelling: number;
  avgBuyPrice: number | null;
  avgSellPrice: number | null;
  matchedVolumeUsdt: number;
  avgSpread: number | null;
  grossSpreadProfit: number; // RWF
  estimatedFees: number; // RWF
  netProfitEstimate: number; // RWF
  inferredOrdersCount: number;
  deltaMonthOrderCount: number | null;
  confidence: "high" | "medium" | "low";
  inventoryImbalanceUsdt: number;
}

// ──────────────────────────────────────────────
// Raw row shapes from SQL
// ──────────────────────────────────────────────

interface DecayFillRow {
  user_no: string;
  nickname: string;
  user_type: string | null;
  monthly_order_count: number | null;
  adv_no: string;
  trade_type: "BUY" | "SELL";
  filled_qty: string;
  price: string;
  scraped_at: string;
  primary_pay_type: string | null;
}

interface OrderCountDeltaRow {
  user_no: string;
  start_count: number | null;
  end_count: number | null;
}

// ──────────────────────────────────────────────
// Bottom-up: list all inferred fills for a single trader
// ──────────────────────────────────────────────

export async function inferFillsForTrader(
  userNo: string,
  startDate: Date,
  endDate: Date
): Promise<FillInference[]> {
  const rows = await runDecayFillsQuery(startDate, endDate, userNo);

  return rows.map((r) => ({
    advNo: r.adv_no,
    tradeType: r.trade_type,
    filledQuantity: Number(r.filled_qty),
    price: Number(r.price),
    fillValueRwf: Number(r.filled_qty) * Number(r.price),
    scrapedAt: new Date(r.scraped_at),
    source: "decay" as const,
  }));
}

// ──────────────────────────────────────────────
// Core SQL: infer fills via tradable_quantity decay across consecutive snapshots
// of the SAME advNo, on the SAME price leg, respecting min/max trade amount.
// ──────────────────────────────────────────────

async function runDecayFillsQuery(
  startDate: Date,
  endDate: Date,
  userNo: string | null
): Promise<DecayFillRow[]> {
  const result = await db.execute(sql`
    WITH ordered_ads AS (
      SELECT
        adv.user_no,
        adv.nickname,
        adv.user_type,
        adv.monthly_order_count,
        a.adv_no,
        a.trade_type,
        CAST(a.price AS numeric) AS price,
        CAST(a.tradable_quantity AS numeric) AS qty,
        CAST(a.min_amount AS numeric) AS min_amt,
        CAST(a.max_amount AS numeric) AS max_amt,
        a.scraped_at,
        a.id AS ad_id,
        LEAD(CAST(a.tradable_quantity AS numeric))
          OVER (PARTITION BY a.adv_no ORDER BY a.scraped_at) AS next_qty,
        LEAD(CAST(a.price AS numeric))
          OVER (PARTITION BY a.adv_no ORDER BY a.scraped_at) AS next_price
      FROM ads a
      INNER JOIN advertisers adv ON adv.id = a.advertiser_id
      WHERE a.scraped_at BETWEEN ${startDate} AND ${endDate}
        AND (${userNo}::text IS NULL OR adv.user_no = ${userNo})
    ),
    decay_fills AS (
      SELECT
        user_no, nickname, user_type, monthly_order_count,
        adv_no, trade_type, price, scraped_at, ad_id,
        (qty - next_qty) AS filled_qty
      FROM ordered_ads
      WHERE next_qty IS NOT NULL
        AND next_price IS NOT NULL
        AND next_price = price
        AND next_qty < qty
        AND (qty - next_qty) > 0
        AND (qty - next_qty) * price BETWEEN COALESCE(min_amt, 0)
                                        AND COALESCE(max_amt, (qty - next_qty) * price)
    )
    SELECT
      f.user_no,
      f.nickname,
      f.user_type,
      f.monthly_order_count,
      f.adv_no,
      f.trade_type,
      f.filled_qty::text AS filled_qty,
      f.price::text AS price,
      f.scraped_at,
      (
        SELECT apm.pay_type
        FROM ad_payment_methods apm
        WHERE apm.ad_id = f.ad_id
        LIMIT 1
      ) AS primary_pay_type
    FROM decay_fills f
    ORDER BY f.user_no, f.scraped_at ASC
  `);

  return result.rows as unknown as DecayFillRow[];
}

// ──────────────────────────────────────────────
// Helper: month_order_count delta per trader over the period,
// pulled from advertiser_snapshots (first vs last in range).
// Returns empty map if the table has no coverage yet.
// ──────────────────────────────────────────────

async function getOrderCountDeltas(
  startDate: Date,
  endDate: Date,
  userNo: string | null
): Promise<Map<string, number>> {
  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT
        adv.user_no,
        s.month_order_count,
        s.scraped_at,
        ROW_NUMBER() OVER (
          PARTITION BY adv.user_no ORDER BY s.scraped_at ASC
        ) AS rn_asc,
        ROW_NUMBER() OVER (
          PARTITION BY adv.user_no ORDER BY s.scraped_at DESC
        ) AS rn_desc
      FROM advertiser_snapshots s
      INNER JOIN advertisers adv ON adv.id = s.advertiser_id
      WHERE s.scraped_at BETWEEN ${startDate} AND ${endDate}
        AND (${userNo}::text IS NULL OR adv.user_no = ${userNo})
    )
    SELECT
      user_no,
      MAX(CASE WHEN rn_asc = 1 THEN month_order_count END) AS start_count,
      MAX(CASE WHEN rn_desc = 1 THEN month_order_count END) AS end_count
    FROM ranked
    GROUP BY user_no
  `);

  const map = new Map<string, number>();
  for (const row of result.rows as unknown as OrderCountDeltaRow[]) {
    if (row.start_count != null && row.end_count != null) {
      const delta = Number(row.end_count) - Number(row.start_count);
      // monthOrderCount can roll over at month boundary — treat negatives as null
      if (delta >= 0) {
        map.set(row.user_no, delta);
      }
    }
  }
  return map;
}

// ──────────────────────────────────────────────
// Aggregation: roll a list of fills into a TraderProfitEstimate
// ──────────────────────────────────────────────

interface AggregateInput {
  userNo: string;
  nickname: string;
  userType: string | null;
  monthlyOrderCount: number | null;
  rows: DecayFillRow[];
  deltaOrderCount: number | null;
}

function aggregateTrader(input: AggregateInput): TraderProfitEstimate {
  let usdtBought = 0;
  let usdtSold = 0;
  let rwfSpentBuying = 0;
  let rwfReceivedSelling = 0;
  let inferredOrdersCount = 0;
  let weightedFeeRwf = 0;

  for (const row of input.rows) {
    const qty = Number(row.filled_qty);
    const price = Number(row.price);
    const value = qty * price;

    // estimate fee for this fill leg using primary pay type
    const fee = row.primary_pay_type
      ? calculateFee(row.primary_pay_type, value)
      : 0;
    weightedFeeRwf += fee;

    if (row.trade_type === "BUY") {
      usdtBought += qty;
      rwfSpentBuying += value;
    } else {
      usdtSold += qty;
      rwfReceivedSelling += value;
    }
    inferredOrdersCount += 1;
  }

  const avgBuyPrice = usdtBought > 0 ? rwfSpentBuying / usdtBought : null;
  const avgSellPrice = usdtSold > 0 ? rwfReceivedSelling / usdtSold : null;
  const matchedVolumeUsdt = Math.min(usdtBought, usdtSold);
  const avgSpread =
    avgBuyPrice != null && avgSellPrice != null
      ? avgSellPrice - avgBuyPrice
      : null;
  const grossSpreadProfit =
    avgSpread != null ? matchedVolumeUsdt * avgSpread : 0;
  const netProfitEstimate = grossSpreadProfit - weightedFeeRwf;

  // Confidence based on how well inferred fills match the orderCount delta
  let confidence: "high" | "medium" | "low" = "low";
  if (input.deltaOrderCount != null && input.deltaOrderCount > 0) {
    const ratio = inferredOrdersCount / input.deltaOrderCount;
    if (ratio >= 0.5 && ratio <= 1.5) confidence = "high";
    else if (ratio >= 0.25 && ratio <= 3) confidence = "medium";
    else confidence = "low";
  } else if (inferredOrdersCount > 0) {
    // No orderCount validation possible — fall back to medium if we have signal
    confidence = "medium";
  }

  return {
    userNo: input.userNo,
    nickname: input.nickname,
    userType: input.userType,
    monthlyOrderCount: input.monthlyOrderCount,
    usdtBought,
    usdtSold,
    rwfSpentBuying,
    rwfReceivedSelling,
    avgBuyPrice,
    avgSellPrice,
    matchedVolumeUsdt,
    avgSpread,
    grossSpreadProfit,
    estimatedFees: weightedFeeRwf,
    netProfitEstimate,
    inferredOrdersCount,
    deltaMonthOrderCount: input.deltaOrderCount,
    confidence,
    inventoryImbalanceUsdt: usdtBought - usdtSold,
  };
}

// ──────────────────────────────────────────────
// Public: estimate profit for a single trader
// ──────────────────────────────────────────────

export async function estimateTraderProfit(
  userNo: string,
  startDate: Date,
  endDate: Date
): Promise<TraderProfitEstimate | null> {
  const rows = await runDecayFillsQuery(startDate, endDate, userNo);
  if (rows.length === 0) return null;

  const deltas = await getOrderCountDeltas(startDate, endDate, userNo);

  const first = rows[0];
  return aggregateTrader({
    userNo: first.user_no,
    nickname: first.nickname,
    userType: first.user_type,
    monthlyOrderCount: first.monthly_order_count,
    rows,
    deltaOrderCount: deltas.get(first.user_no) ?? null,
  });
}

// ──────────────────────────────────────────────
// Public: estimate profit for all traders, ranked by net profit
// ──────────────────────────────────────────────

export async function estimateAllTradersProfit(
  startDate: Date,
  endDate: Date,
  limit: number = 50
): Promise<TraderProfitEstimate[]> {
  const rows = await runDecayFillsQuery(startDate, endDate, null);
  if (rows.length === 0) return [];

  const deltas = await getOrderCountDeltas(startDate, endDate, null);

  // Group rows by user_no
  const grouped = new Map<string, DecayFillRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.user_no);
    if (list) list.push(row);
    else grouped.set(row.user_no, [row]);
  }

  const estimates: TraderProfitEstimate[] = [];
  for (const [userNo, traderRows] of grouped) {
    const first = traderRows[0];
    estimates.push(
      aggregateTrader({
        userNo,
        nickname: first.nickname,
        userType: first.user_type,
        monthlyOrderCount: first.monthly_order_count,
        rows: traderRows,
        deltaOrderCount: deltas.get(userNo) ?? null,
      })
    );
  }

  // Sort by net profit descending; traders with negative profit go to the bottom
  estimates.sort((a, b) => b.netProfitEstimate - a.netProfitEstimate);
  return estimates.slice(0, limit);
}
