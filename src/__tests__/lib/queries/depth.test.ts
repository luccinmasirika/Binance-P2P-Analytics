import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

import { getLatestDepth, getDepthByPaymentMethod, getDepthComparison } from "@/lib/queries/depth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getLatestDepth", () => {
  it("returns depth without tradeType filter", async () => {
    const result = await getLatestDepth("RWF");
    expect(result).toEqual([]);
  });

  it("returns depth filtered by BUY", async () => {
    await getLatestDepth("RWF", "BUY");
  });

  it("returns depth filtered by SELL", async () => {
    await getLatestDepth("RWF", "SELL");
  });
});

describe("getDepthByPaymentMethod", () => {
  it("returns depth grouped by payment method", async () => {
    const result = await getDepthByPaymentMethod("RWF");
    expect(result).toEqual([]);
  });
});

describe("getDepthComparison", () => {
  it("returns comparison for 24h period (default)", async () => {
    const result = await getDepthComparison("RWF");
    expect(result).toEqual([]);
  });

  it("returns comparison for 7d period", async () => {
    const result = await getDepthComparison("RWF", "7d");
    expect(result).toEqual([]);
  });
});
