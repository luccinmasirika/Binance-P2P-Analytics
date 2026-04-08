import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/queries/stats", () => ({
  getCurrentStats: vi.fn().mockResolvedValue({ bestBuyPrice: 3850 }),
  getPriceHistory: vi.fn().mockResolvedValue([{ time: "now" }]),
  getSpreadHistory: vi.fn().mockResolvedValue([{ spread: 100 }]),
  getHeatmapData: vi.fn().mockResolvedValue([{ hour: 10 }]),
}));

import { GET } from "@/app/api/stats/route";
import { NextRequest } from "next/server";

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/stats");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/stats", () => {
  it("returns current stats by default", async () => {
    const res = await GET(createRequest());
    const data = await res.json();
    expect(data.bestBuyPrice).toBe(3850);
  });

  it("returns price history", async () => {
    const res = await GET(createRequest({ type: "price", period: "7d" }));
    const data = await res.json();
    expect(data).toHaveLength(1);
  });

  it("returns spread history", async () => {
    const res = await GET(createRequest({ type: "spread" }));
    const data = await res.json();
    expect(data[0].spread).toBe(100);
  });

  it("returns heatmap data", async () => {
    const res = await GET(createRequest({ type: "heatmap" }));
    const data = await res.json();
    expect(data[0].hour).toBe(10);
  });

  it("returns 400 for invalid type", async () => {
    const res = await GET(createRequest({ type: "invalid" }));
    expect(res.status).toBe(400);
  });
});
