import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/queries/traders", () => ({
  getTopTraders: vi.fn().mockResolvedValue([{ nickname: "Trader1" }]),
  getTraderProfile: vi.fn().mockResolvedValue({ trader: { nickname: "X" } }),
  getTraderHourlyPatterns: vi.fn().mockResolvedValue([{ hour: 10 }]),
  getMarketMakers: vi.fn().mockResolvedValue([{ nickname: "MM1" }]),
}));

import { GET } from "@/app/api/traders/route";
import { NextRequest } from "next/server";

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/traders");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/traders", () => {
  it("returns top traders by default", async () => {
    const res = await GET(createRequest());
    const data = await res.json();
    expect(data[0].nickname).toBe("Trader1");
  });

  it("accepts custom limit for top traders", async () => {
    const { getTopTraders } = await import("@/lib/queries/traders");
    await GET(createRequest({ type: "top", limit: "5" }));
    expect(getTopTraders).toHaveBeenCalledWith(5);
  });

  it("returns trader profile", async () => {
    const res = await GET(createRequest({ type: "profile", userNo: "u1" }));
    const data = await res.json();
    expect(data.trader.nickname).toBe("X");
  });

  it("returns 400 for profile without userNo", async () => {
    const res = await GET(createRequest({ type: "profile" }));
    expect(res.status).toBe(400);
  });

  it("returns trader patterns", async () => {
    const res = await GET(createRequest({ type: "patterns", userNo: "u1" }));
    const data = await res.json();
    expect(data[0].hour).toBe(10);
  });

  it("returns 400 for patterns without userNo", async () => {
    const res = await GET(createRequest({ type: "patterns" }));
    expect(res.status).toBe(400);
  });

  it("returns market makers", async () => {
    const res = await GET(createRequest({ type: "marketMakers" }));
    const data = await res.json();
    expect(data[0].nickname).toBe("MM1");
  });

  it("returns 400 for invalid type", async () => {
    const res = await GET(createRequest({ type: "invalid" }));
    expect(res.status).toBe(400);
  });
});
