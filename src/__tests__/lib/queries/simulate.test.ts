import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    execute: vi.fn(),
  },
}));

import { runSimulation, type SimulationParams } from "@/lib/queries/simulate";

const baseParams: SimulationParams = {
  capital: 100000,
  paymentMethods: ["MTNMobileMoney"],
  hoursPerDay: 4,
  minutesPerTrade: 20,
  startDate: "2024-01-01",
  endDate: "2024-01-07",
  priceStrategy: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runSimulation", () => {
  it("returns empty result when no spread data", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.execute).mockResolvedValue({ rows: [] } as any);

    const result = await runSimulation(baseParams);
    expect(result.totalProfit).toBe(0);
    expect(result.avgDailyProfit).toBe(0);
    expect(result.roiPercent).toBe(0);
    expect(result.totalCycles).toBe(0);
    expect(result.bestDay).toBeNull();
    expect(result.worstDay).toBeNull();
    expect(result.dailyProfits).toEqual([]);
    expect(result.hourlyOptimal).toEqual([]);
  });

  it("calculates profit from spread data", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.execute).mockResolvedValue({
      rows: [
        {
          time_bucket: "2024-01-01 10:00:00",
          buy_price: 3800,
          sell_price: 3900,
          spread: 100,
          hour_of_day: 10,
          day: "2024-01-01",
        },
        {
          time_bucket: "2024-01-01 11:00:00",
          buy_price: 3810,
          sell_price: 3910,
          spread: 100,
          hour_of_day: 11,
          day: "2024-01-01",
        },
        {
          time_bucket: "2024-01-02 10:00:00",
          buy_price: 3800,
          sell_price: 3880,
          spread: 80,
          hour_of_day: 10,
          day: "2024-01-02",
        },
      ],
    } as any);

    const result = await runSimulation(baseParams);
    expect(result.totalProfit).toBeGreaterThan(0);
    expect(result.totalCycles).toBeGreaterThan(0);
    expect(result.roiPercent).toBeGreaterThan(0);
    expect(result.dailyProfits).toHaveLength(2);
    expect(result.bestDay).not.toBeNull();
    expect(result.worstDay).not.toBeNull();
    expect(result.hourlyOptimal.length).toBeGreaterThan(0);
  });

  it("deducts fees from spread", async () => {
    const { db } = await import("@/lib/db/client");
    // Spread of 30 RWF, fee is 20*2=40, net is negative -> should skip
    vi.mocked(db.execute).mockResolvedValue({
      rows: [
        {
          time_bucket: "2024-01-01 10:00:00",
          buy_price: 3800,
          sell_price: 3830,
          spread: 30,
          hour_of_day: 10,
          day: "2024-01-01",
        },
      ],
    } as any);

    const result = await runSimulation(baseParams);
    expect(result.totalProfit).toBe(0); // spread - fees <= 0
    expect(result.totalCycles).toBe(0);
  });

  it("limits cycles per day based on time available", async () => {
    const { db } = await import("@/lib/db/client");
    // 4 hours / 20 min = 12 cycles max per day
    const rows = Array.from({ length: 20 }, (_, i) => ({
      time_bucket: `2024-01-01 ${String(i).padStart(2, "0")}:00:00`,
      buy_price: 3800,
      sell_price: 3950,
      spread: 150,
      hour_of_day: i,
      day: "2024-01-01",
    }));

    vi.mocked(db.execute).mockResolvedValue({ rows } as any);

    const result = await runSimulation(baseParams);
    // Should be capped at 12 cycles
    expect(result.dailyProfits[0].cycles).toBeLessThanOrEqual(12);
  });

  it("handles empty paymentMethods with default fee", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.execute).mockResolvedValue({
      rows: [
        {
          time_bucket: "2024-01-01 10:00:00",
          buy_price: 3800,
          sell_price: 3950,
          spread: 150,
          hour_of_day: 10,
          day: "2024-01-01",
        },
      ],
    } as any);

    const result = await runSimulation({ ...baseParams, paymentMethods: [] });
    expect(result.totalProfit).toBeGreaterThan(0);
  });

  it("calculates ROI correctly", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.execute).mockResolvedValue({
      rows: [
        {
          time_bucket: "2024-01-01 10:00:00",
          buy_price: 3800,
          sell_price: 3950,
          spread: 150,
          hour_of_day: 10,
          day: "2024-01-01",
        },
      ],
    } as any);

    const result = await runSimulation(baseParams);
    expect(result.roiPercent).toBe((result.totalProfit / baseParams.capital) * 100);
  });

  it("finds best and worst day across multiple days", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.execute).mockResolvedValue({
      rows: [
        { time_bucket: "2024-01-01 10:00", buy_price: 3800, sell_price: 3900, spread: 100, hour_of_day: 10, day: "2024-01-01" },
        { time_bucket: "2024-01-02 10:00", buy_price: 3800, sell_price: 3950, spread: 150, hour_of_day: 10, day: "2024-01-02" },
        { time_bucket: "2024-01-03 10:00", buy_price: 3800, sell_price: 3860, spread: 60, hour_of_day: 10, day: "2024-01-03" },
      ],
    } as any);

    const result = await runSimulation(baseParams);
    expect(result.bestDay).not.toBeNull();
    expect(result.worstDay).not.toBeNull();
    expect(result.bestDay!.profit).toBeGreaterThanOrEqual(result.worstDay!.profit);
  });

  it("handles zero capital", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.execute).mockResolvedValue({ rows: [] } as any);

    const result = await runSimulation({ ...baseParams, capital: 0 });
    expect(result.roiPercent).toBe(0);
  });

  it("sorts hourly optimal by avgSpread descending", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.execute).mockResolvedValue({
      rows: [
        { time_bucket: "2024-01-01 08:00", buy_price: 3800, sell_price: 3900, spread: 100, hour_of_day: 8, day: "2024-01-01" },
        { time_bucket: "2024-01-01 14:00", buy_price: 3800, sell_price: 3950, spread: 150, hour_of_day: 14, day: "2024-01-01" },
      ],
    } as any);

    const result = await runSimulation(baseParams);
    if (result.hourlyOptimal.length >= 2) {
      expect(result.hourlyOptimal[0].avgSpread).toBeGreaterThanOrEqual(
        result.hourlyOptimal[1].avgSpread
      );
    }
  });
});
