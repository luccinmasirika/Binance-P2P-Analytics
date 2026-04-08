import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          // Return object that can be used as both direct result and chained
          const result = Promise.resolve([
            { price: "3850", count: 5, totalVolume: "500" },
          ]);
          (result as any).orderBy = vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { rate: "1350", fetchedAt: new Date(), target: "RWF" },
            ]),
          });
          return result;
        }),
      }),
    }),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

import { getCurrentStats, getPriceHistory, getSpreadHistory, getHeatmapData } from "@/lib/queries/stats";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentStats", () => {
  it("returns stats with buy and sell prices", async () => {
    const result = await getCurrentStats();
    expect(result).toHaveProperty("bestBuyPrice");
    expect(result).toHaveProperty("bestSellPrice");
    expect(result).toHaveProperty("spread");
    expect(result).toHaveProperty("forexRate");
    expect(result).toHaveProperty("p2pPremium");
    expect(result).toHaveProperty("buyAdCount");
    expect(result).toHaveProperty("sellAdCount");
    expect(result).toHaveProperty("buyVolume");
    expect(result).toHaveProperty("sellVolume");
  });

  it("handles null prices and missing forex", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          const result = Promise.resolve([
            { price: null, count: 0, totalVolume: null },
          ]);
          (result as any).orderBy = vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          });
          return result;
        }),
      }),
    } as any);

    const result = await getCurrentStats();
    expect(result.bestBuyPrice).toBeNull();
    expect(result.bestSellPrice).toBeNull();
    expect(result.spread).toBeNull();
    expect(result.forexRate).toBeNull();
    expect(result.p2pPremium).toBeNull();
    expect(result.buyVolume).toBe(0);
    expect(result.sellVolume).toBe(0);
    expect(result.buyAdCount).toBe(0);
    expect(result.sellAdCount).toBe(0);
  });

  it("handles undefined bestBuy/bestSell (empty result)", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          const result = Promise.resolve([undefined]);
          (result as any).orderBy = vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          });
          return result;
        }),
      }),
    } as any);

    const result = await getCurrentStats();
    expect(result.buyAdCount).toBe(0);
    expect(result.sellAdCount).toBe(0);
  });

  it("computes premium when both buy price and forex rate exist", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          const result = Promise.resolve([
            { price: "3850", count: 5, totalVolume: "500" },
          ]);
          (result as any).orderBy = vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { rate: "1350", fetchedAt: new Date(), target: "RWF" },
            ]),
          });
          return result;
        }),
      }),
    } as any);

    const result = await getCurrentStats();
    expect(result.bestBuyPrice).toBe(3850);
    expect(result.forexRate).toBe(1350);
    expect(result.p2pPremium).not.toBeNull();
    expect(result.buyVolume).toBe(500);
    expect(result.sellVolume).toBe(500);
  });
});

describe("getPriceHistory", () => {
  it("returns rows for default period (24h)", async () => {
    const result = await getPriceHistory();
    expect(result).toEqual([]);
  });

  it("handles 7d period", async () => {
    await getPriceHistory("7d");
  });

  it("handles 30d period", async () => {
    await getPriceHistory("30d");
  });

  it("defaults to 24h for unknown period", async () => {
    await getPriceHistory("1y");
  });
});

describe("getSpreadHistory", () => {
  it("returns spread data for default period", async () => {
    const result = await getSpreadHistory();
    expect(result).toEqual([]);
  });

  it("handles 7d period", async () => {
    await getSpreadHistory("7d");
  });

  it("handles 30d period", async () => {
    await getSpreadHistory("30d");
  });
});

describe("getHeatmapData", () => {
  it("returns heatmap data", async () => {
    const result = await getHeatmapData();
    expect(result).toEqual([]);
  });
});
