import { db } from "../db/client";
import { sql } from "drizzle-orm";
import { calculateSendFee, calculateReceiveFee } from "../constants/fees";

export type AnalysisMode = "daily" | "weekly";

export interface OpportunityParams {
  fiat: string;
  dateStart: string;      // "YYYY-MM-DD" (inclusive, UTC)
  dateEnd: string;        // "YYYY-MM-DD" (inclusive, UTC)
  mode: AnalysisMode;
  // Daily-only filters (ignored in weekly mode)
  morningStart: number;   // 0-23
  morningEnd: number;     // 1-24 (exclusive)
  eveningStart: number;   // 0-23
  eveningEnd: number;     // 1-24 (exclusive)
  // Weekly-only filters (ignored in daily mode). 0=Sunday … 6=Saturday.
  buyDayOfWeek?: number;
  sellDayOfWeek?: number;
  capital: number;
  payType?: string;
}

export interface CycleOpportunity {
  buyDate: string;
  sellDate: string;
  bestBuyPrice: number | null;
  bestSellPrice: number | null;
  grossSpread: number | null;
  usdtAcquired: number | null;
  grossProfitLocal: number | null;
  sendFee: number;
  receiveFeeOnGross: number;
  netProfitLocal: number | null;
  viable: boolean;
}

export interface CumulativeSummary {
  totalNetProfit: number;
  totalGrossProfit: number;
  viableCycles: number;
  totalCycles: number;
  avgNetPerViableCycle: number;
  roiPercent: number;
}

export interface SingleCycleSummary {
  buyDate: string;
  sellDate: string;
  bestBuyPrice: number | null;
  bestSellPrice: number | null;
  grossSpread: number | null;
  usdtAcquired: number | null;
  grossProfitLocal: number | null;
  sendFee: number;
  receiveFeeOnGross: number;
  netProfitLocal: number | null;
  roiPercent: number | null;
  viable: boolean;
}

export interface OpportunityResult {
  mode: AnalysisMode;
  cycles: CycleOpportunity[];
  cumulative: CumulativeSummary;
  singleCycle: SingleCycleSummary;
  meta: {
    fiat: string;
    payType: string | null;
    capital: number;
    morningWindow?: [number, number];
    eveningWindow?: [number, number];
    buyDayOfWeek?: number;
    sellDayOfWeek?: number;
  };
  warning?: string;
}

interface DailyRawRow {
  day: string;
  best_buy: string | number | null;
  best_sell: string | number | null;
}

function computeCycle(
  bestBuyPrice: number | null,
  bestSellPrice: number | null,
  capital: number,
  payType: string | undefined,
): {
  grossSpread: number | null;
  usdtAcquired: number | null;
  grossProfitLocal: number | null;
  sendFee: number;
  receiveFeeOnGross: number;
  netProfitLocal: number | null;
} {
  const sendFee = calculateSendFee(payType, capital);
  if (bestBuyPrice === null || bestSellPrice === null || bestBuyPrice <= 0) {
    return {
      grossSpread: null,
      usdtAcquired: null,
      grossProfitLocal: null,
      sendFee,
      receiveFeeOnGross: 0,
      netProfitLocal: null,
    };
  }
  const grossSpread = bestSellPrice - bestBuyPrice;
  const usdtAcquired = capital / bestBuyPrice;
  const grossProfitLocal = grossSpread * usdtAcquired;
  const receiveFeeOnGross = calculateReceiveFee(payType, capital + grossProfitLocal);
  const netProfitLocal = grossProfitLocal - sendFee - receiveFeeOnGross;
  return {
    grossSpread,
    usdtAcquired,
    grossProfitLocal,
    sendFee,
    receiveFeeOnGross,
    netProfitLocal,
  };
}

async function runDailyQuery(
  params: OpportunityParams,
): Promise<Map<string, { bestBuy: number | null; bestSell: number | null }>> {
  const {
    fiat,
    dateStart,
    dateEnd,
    morningStart,
    morningEnd,
    eveningStart,
    eveningEnd,
    capital,
    payType,
    mode,
  } = params;

  const payFilter = payType ? sql`AND apm.pay_type = ${payType}` : sql``;

  // In weekly mode, the windows cover the full day (0-24) so we get best BUY
  // and best SELL across the whole day.
  const mStart = mode === "weekly" ? 0 : morningStart;
  const mEnd = mode === "weekly" ? 24 : morningEnd;
  const eStart = mode === "weekly" ? 0 : eveningStart;
  const eEnd = mode === "weekly" ? 24 : eveningEnd;

  const result = await db.execute(sql`
    WITH ad_with_pay AS (
      SELECT DISTINCT ON (a.id)
        a.id,
        a.trade_type,
        CAST(a.price AS numeric) AS price,
        (a.scraped_at AT TIME ZONE 'UTC')::date AS day,
        EXTRACT(HOUR FROM a.scraped_at AT TIME ZONE 'UTC')::int AS hour_utc
      FROM ads a
      INNER JOIN ad_payment_methods apm ON apm.ad_id = a.id
      WHERE a.fiat = ${fiat}
        AND a.scraped_at >= ${dateStart}::date
        AND a.scraped_at <  (${dateEnd}::date + INTERVAL '1 day')
        AND CAST(a.min_amount AS numeric) <= ${capital}
        AND CAST(a.max_amount AS numeric) >= ${capital}
        ${payFilter}
      ORDER BY a.id
    ),
    day_series AS (
      SELECT gs::date AS day
      FROM generate_series(${dateStart}::date, ${dateEnd}::date, INTERVAL '1 day') gs
    ),
    per_day AS (
      SELECT
        day,
        MIN(price) FILTER (
          WHERE trade_type = 'BUY'
            AND hour_utc >= ${mStart} AND hour_utc < ${mEnd}
        ) AS best_buy,
        MAX(price) FILTER (
          WHERE trade_type = 'SELL'
            AND hour_utc >= ${eStart} AND hour_utc < ${eEnd}
        ) AS best_sell
      FROM ad_with_pay
      GROUP BY day
    )
    SELECT ds.day::text AS day, pd.best_buy, pd.best_sell
    FROM day_series ds
    LEFT JOIN per_day pd USING (day)
    ORDER BY ds.day ASC
  `);

  const rows = result.rows as unknown as DailyRawRow[];
  const map = new Map<string, { bestBuy: number | null; bestSell: number | null }>();
  for (const row of rows) {
    map.set(row.day, {
      bestBuy: row.best_buy !== null ? Number(row.best_buy) : null,
      bestSell: row.best_sell !== null ? Number(row.best_sell) : null,
    });
  }
  return map;
}

function generateWeeklyCycles(
  dateStart: string,
  dateEnd: string,
  buyDow: number,
  sellDow: number,
): { buyDate: string; sellDate: string }[] {
  const start = new Date(dateStart + "T00:00:00Z");
  const end = new Date(dateEnd + "T00:00:00Z");
  const cycles: { buyDate: string; sellDate: string }[] = [];

  // Walk forward to the first occurrence of buyDow >= start
  const cursor = new Date(start);
  while (cursor <= end && cursor.getUTCDay() !== buyDow) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const diff = (sellDow - buyDow + 7) % 7;
  const cycleSpanDays = diff === 0 ? 7 : diff;

  while (cursor <= end) {
    const buyDate = new Date(cursor);
    const sellDate = new Date(buyDate);
    sellDate.setUTCDate(sellDate.getUTCDate() + cycleSpanDays);

    if (sellDate > end) break;

    cycles.push({
      buyDate: buyDate.toISOString().slice(0, 10),
      sellDate: sellDate.toISOString().slice(0, 10),
    });

    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return cycles;
}

export async function analyzeOpportunities(params: OpportunityParams): Promise<OpportunityResult> {
  const { mode, dateStart, dateEnd, capital, payType } = params;

  const perDay = await runDailyQuery(params);

  let cycles: CycleOpportunity[];

  if (mode === "daily") {
    // One cycle per day: buy in morning window, sell in evening window (same day).
    const orderedDays = Array.from(perDay.keys()).sort();
    cycles = orderedDays.map((day) => {
      const d = perDay.get(day)!;
      const calc = computeCycle(d.bestBuy, d.bestSell, capital, payType);
      return {
        buyDate: day,
        sellDate: day,
        bestBuyPrice: d.bestBuy,
        bestSellPrice: d.bestSell,
        ...calc,
        viable: calc.netProfitLocal !== null && calc.netProfitLocal > 0,
      };
    });
  } else {
    // Weekly: one cycle per (buyDow, sellDow) pair within the date range.
    const buyDow = params.buyDayOfWeek ?? 1; // Monday
    const sellDow = params.sellDayOfWeek ?? 6; // Saturday
    const weekly = generateWeeklyCycles(dateStart, dateEnd, buyDow, sellDow);
    cycles = weekly.map(({ buyDate, sellDate }) => {
      const bestBuy = perDay.get(buyDate)?.bestBuy ?? null;
      const bestSell = perDay.get(sellDate)?.bestSell ?? null;
      const calc = computeCycle(bestBuy, bestSell, capital, payType);
      return {
        buyDate,
        sellDate,
        bestBuyPrice: bestBuy,
        bestSellPrice: bestSell,
        ...calc,
        viable: calc.netProfitLocal !== null && calc.netProfitLocal > 0,
      };
    });
  }

  const viableCycles = cycles.filter((c) => c.viable).length;
  const totalNetProfit = cycles.reduce((sum, c) => sum + (c.netProfitLocal ?? 0), 0);
  const totalGrossProfit = cycles.reduce((sum, c) => sum + (c.grossProfitLocal ?? 0), 0);
  const avgNetPerViableCycle = viableCycles > 0 ? totalNetProfit / viableCycles : 0;
  const roiPercent = capital > 0 ? (totalNetProfit / capital) * 100 : 0;

  const cumulative: CumulativeSummary = {
    totalNetProfit,
    totalGrossProfit,
    viableCycles,
    totalCycles: cycles.length,
    avgNetPerViableCycle,
    roiPercent,
  };

  // Single cycle: buy on first cycle's buyDate, sell on last cycle's sellDate.
  const first = cycles[0];
  const last = cycles[cycles.length - 1];
  const singleBuyDate = first?.buyDate ?? dateStart;
  const singleSellDate = last?.sellDate ?? dateEnd;
  const singleBuy = perDay.get(singleBuyDate)?.bestBuy ?? null;
  const singleSell = perDay.get(singleSellDate)?.bestSell ?? null;
  const singleCalc = computeCycle(singleBuy, singleSell, capital, payType);
  const singleCycle: SingleCycleSummary = {
    buyDate: singleBuyDate,
    sellDate: singleSellDate,
    bestBuyPrice: singleBuy,
    bestSellPrice: singleSell,
    ...singleCalc,
    roiPercent:
      singleCalc.netProfitLocal !== null && capital > 0
        ? (singleCalc.netProfitLocal / capital) * 100
        : null,
    viable: singleCalc.netProfitLocal !== null && singleCalc.netProfitLocal > 0,
  };

  const rangeDays = perDay.size;
  const warning = rangeDays > 60
    ? "La plage dépasse 60 jours, le calcul peut être lent."
    : mode === "weekly" && cycles.length === 0
    ? "Aucun cycle hebdomadaire complet ne rentre dans cette plage. Élargissez les dates."
    : undefined;

  return {
    mode,
    cycles,
    cumulative,
    singleCycle,
    meta: {
      fiat: params.fiat,
      payType: payType ?? null,
      capital,
      ...(mode === "daily"
        ? {
            morningWindow: [params.morningStart, params.morningEnd],
            eveningWindow: [params.eveningStart, params.eveningEnd],
          }
        : {
            buyDayOfWeek: params.buyDayOfWeek,
            sellDayOfWeek: params.sellDayOfWeek,
          }),
    },
    warning,
  };
}
