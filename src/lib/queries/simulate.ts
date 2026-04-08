import { db } from "../db/client";
import { ads, adPaymentMethods } from "../db/schema";
import { sql } from "drizzle-orm";
import { calculateFee } from "../constants/fees";

export interface SimulationParams {
  capital: number;           // RWF
  paymentMethods: string[];  // e.g. ["MTNMobileMoney", "BankTransfer"]
  hoursPerDay: number;       // available trading hours
  minutesPerTrade: number;   // estimated time per buy-sell cycle
  startDate: string;         // ISO date
  endDate: string;           // ISO date
  priceStrategy: 1 | 2 | 3; // 1st/2nd/3rd best price (realism level)
}

export interface SimulationResult {
  totalProfit: number;
  avgDailyProfit: number;
  roiPercent: number;
  bestDay: { date: string; profit: number } | null;
  worstDay: { date: string; profit: number } | null;
  totalCycles: number;
  dailyProfits: { date: string; profit: number; cycles: number }[];
  hourlyOptimal: { hour: number; avgSpread: number }[];
}

export async function runSimulation(params: SimulationParams): Promise<SimulationResult> {
  const {
    capital,
    paymentMethods,
    hoursPerDay,
    minutesPerTrade,
    startDate,
    endDate,
    priceStrategy,
  } = params;

  const cyclesPerDay = Math.floor((hoursPerDay * 60) / minutesPerTrade);

  // Get time-bucketed best prices filtered by capital range and payment methods
  const payFilter = paymentMethods.length > 0
    ? sql`AND apm.pay_type = ANY(ARRAY[${sql.raw(paymentMethods.map(p => `'${p}'`).join(","))}]::text[])`
    : sql``;

  const result = await db.execute(sql`
    WITH eligible_ads AS (
      SELECT DISTINCT ON (a.id)
        a.id, a.trade_type, a.price, a.scraped_at, apm.pay_type
      FROM ads a
      INNER JOIN ad_payment_methods apm ON apm.ad_id = a.id
      WHERE a.scraped_at BETWEEN ${startDate}::timestamp AND ${endDate}::timestamp
        AND CAST(a.min_amount AS numeric) <= ${capital}
        AND CAST(a.max_amount AS numeric) >= ${capital}
        ${payFilter}
    ),
    ranked AS (
      SELECT
        date_trunc('hour', scraped_at) AS time_bucket,
        trade_type,
        CAST(price AS numeric) AS price,
        ROW_NUMBER() OVER (
          PARTITION BY date_trunc('hour', scraped_at), trade_type
          ORDER BY
            CASE WHEN trade_type = 'BUY' THEN CAST(price AS numeric) END ASC,
            CASE WHEN trade_type = 'SELL' THEN CAST(price AS numeric) END DESC
        ) AS rank
      FROM eligible_ads
    ),
    spreads AS (
      SELECT
        b.time_bucket,
        b.price AS buy_price,
        s.price AS sell_price,
        s.price - b.price AS spread
      FROM ranked b
      INNER JOIN ranked s ON b.time_bucket = s.time_bucket + INTERVAL '10 minutes'
      WHERE b.trade_type = 'BUY' AND b.rank = ${priceStrategy}
        AND s.trade_type = 'SELL' AND s.rank = ${priceStrategy}
    )
    SELECT
      time_bucket::text,
      buy_price,
      sell_price,
      spread,
      EXTRACT(HOUR FROM time_bucket) AS hour_of_day,
      time_bucket::date::text AS day
    FROM spreads
    ORDER BY time_bucket ASC
  `);

  const rows = result.rows as Array<{
    time_bucket: string;
    buy_price: number;
    sell_price: number;
    spread: number;
    hour_of_day: number;
    day: string;
  }>;

  // Calculate fees per cycle (buy fee + sell fee)
  const primaryPayType = paymentMethods[0] || "MTNMobileMoney";
  const feePerCycle = calculateFee(primaryPayType, capital) * 2;

  // Aggregate by day
  const dailyMap = new Map<string, { profit: number; cycles: number }>();
  const hourlyMap = new Map<number, { totalSpread: number; count: number }>();

  for (const row of rows) {
    const netSpread = Number(row.spread) - feePerCycle;
    if (netSpread <= 0) continue;

    // Profit per cycle = (spread per USDT) * (capital / buy_price)
    const usdtAmount = capital / Number(row.buy_price);
    const profitPerCycle = netSpread * usdtAmount;

    const day = row.day;
    const existing = dailyMap.get(day) || { profit: 0, cycles: 0 };
    if (existing.cycles < cyclesPerDay) {
      existing.profit += profitPerCycle;
      existing.cycles++;
      dailyMap.set(day, existing);
    }

    const hour = Number(row.hour_of_day);
    const hourExisting = hourlyMap.get(hour) || { totalSpread: 0, count: 0 };
    hourExisting.totalSpread += Number(row.spread);
    hourExisting.count++;
    hourlyMap.set(hour, hourExisting);
  }

  const dailyProfits = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalProfit = dailyProfits.reduce((sum, d) => sum + d.profit, 0);
  const totalCycles = dailyProfits.reduce((sum, d) => sum + d.cycles, 0);
  const avgDailyProfit = dailyProfits.length > 0 ? totalProfit / dailyProfits.length : 0;
  const roiPercent = capital > 0 ? (totalProfit / capital) * 100 : 0;

  const bestDay = dailyProfits.length > 0
    ? dailyProfits.reduce((best, d) => d.profit > best.profit ? d : best)
    : null;
  const worstDay = dailyProfits.length > 0
    ? dailyProfits.reduce((worst, d) => d.profit < worst.profit ? d : worst)
    : null;

  const hourlyOptimal = Array.from(hourlyMap.entries())
    .map(([hour, data]) => ({
      hour,
      avgSpread: data.totalSpread / data.count,
    }))
    .sort((a, b) => b.avgSpread - a.avgSpread);

  return {
    totalProfit,
    avgDailyProfit,
    roiPercent,
    bestDay: bestDay ? { date: bestDay.date, profit: bestDay.profit } : null,
    worstDay: worstDay ? { date: worstDay.date, profit: worstDay.profit } : null,
    totalCycles,
    dailyProfits,
    hourlyOptimal,
  };
}
