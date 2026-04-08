import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

import { getTopTraders, getTraderProfile, getTraderHourlyPatterns, getMarketMakers } from "@/lib/queries/traders";

beforeEach(async () => {
  vi.clearAllMocks();
  const { db } = await import("@/lib/db/client");
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  } as any);
  vi.mocked(db.execute).mockResolvedValue({ rows: [] } as any);
});

describe("getTopTraders", () => {
  it("returns top traders with default limit", async () => {
    const result = await getTopTraders();
    expect(result).toEqual([]);
  });

  it("accepts custom limit", async () => {
    await getTopTraders(5);
  });
});

describe("getTraderProfile", () => {
  it("returns null when trader not found", async () => {
    const result = await getTraderProfile("nonexistent");
    expect(result).toBeNull();
  });

  it("returns profile when trader exists", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 1, userNo: "u1" }]),
        }),
      }),
    } as any);
    vi.mocked(db.execute).mockResolvedValue({ rows: [] } as any);

    const result = await getTraderProfile("u1");
    expect(result).toHaveProperty("trader");
    expect(result).toHaveProperty("adHistory");
  });
});

describe("getTraderHourlyPatterns", () => {
  it("returns null when trader not found", async () => {
    const result = await getTraderHourlyPatterns("nonexistent");
    expect(result).toBeNull();
  });

  it("returns patterns when trader exists", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 1, userNo: "u1" }]),
        }),
      }),
    } as any);
    vi.mocked(db.execute).mockResolvedValue({ rows: [{ hour_of_day: 10 }] } as any);

    const result = await getTraderHourlyPatterns("u1");
    expect(result).toEqual([{ hour_of_day: 10 }]);
  });
});

describe("getMarketMakers", () => {
  it("returns market makers", async () => {
    const result = await getMarketMakers();
    expect(result).toEqual([]);
  });
});
