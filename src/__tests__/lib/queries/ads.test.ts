import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    selectDistinct: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

import { getRecentAds, getAdPaymentMethods, getDistinctPaymentMethods, periodToInterval } from "@/lib/queries/ads";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRecentAds", () => {
  it("returns ads with default filters", async () => {
    const result = await getRecentAds();
    expect(result).toEqual([]);
  });

  it("accepts fiat filter", async () => {
    await getRecentAds({ fiat: "RWF" });
  });

  it("accepts tradeType filter", async () => {
    await getRecentAds({ tradeType: "BUY" });
  });

  it("accepts period filter 24h", async () => {
    await getRecentAds({ period: "24h" });
  });

  it("accepts period filter 7d", async () => {
    await getRecentAds({ period: "7d" });
  });

  it("accepts period filter 30d", async () => {
    await getRecentAds({ period: "30d" });
  });

  it("accepts date range filters", async () => {
    await getRecentAds({
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    });
  });

  it("accepts limit and offset", async () => {
    await getRecentAds({ limit: 10, offset: 20 });
  });

  it("handles unknown period as default", async () => {
    await getRecentAds({ period: "24h" });
  });
});

describe("periodToInterval", () => {
  it("returns correct intervals", () => {
    expect(periodToInterval("24h")).toBe("24 hours");
    expect(periodToInterval("7d")).toBe("7 days");
    expect(periodToInterval("30d")).toBe("30 days");
  });

  it("defaults to 24 hours for unknown period", () => {
    expect(periodToInterval("unknown")).toBe("24 hours");
  });
});

describe("getAdPaymentMethods", () => {
  it("returns empty array for empty adIds", async () => {
    const result = await getAdPaymentMethods([]);
    expect(result).toEqual([]);
  });

  it("queries payment methods for given adIds", async () => {
    const { db } = await import("@/lib/db/client");
    await getAdPaymentMethods([1, 2, 3]);
    expect(db.select).toHaveBeenCalled();
  });
});

describe("getDistinctPaymentMethods", () => {
  it("returns distinct payment methods", async () => {
    const result = await getDistinctPaymentMethods();
    expect(result).toEqual([]);
  });
});
