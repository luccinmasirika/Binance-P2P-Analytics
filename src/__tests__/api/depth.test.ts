import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/queries/depth", () => ({
  getLatestDepth: vi.fn().mockResolvedValue([{ priceLevel: "3850" }]),
  getDepthByPaymentMethod: vi.fn().mockResolvedValue([{ pay_type: "MTN" }]),
  getDepthComparison: vi.fn().mockResolvedValue([{ trade_type: "BUY" }]),
}));

import { GET } from "@/app/api/depth/route";
import { NextRequest } from "next/server";

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/depth");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/depth", () => {
  it("returns current depth by default", async () => {
    const res = await GET(createRequest());
    const data = await res.json();
    expect(data[0].priceLevel).toBe("3850");
  });

  it("passes tradeType filter", async () => {
    const { getLatestDepth } = await import("@/lib/queries/depth");
    await GET(createRequest({ tradeType: "BUY" }));
    expect(getLatestDepth).toHaveBeenCalledWith("BUY");
  });

  it("passes undefined when no tradeType", async () => {
    const { getLatestDepth } = await import("@/lib/queries/depth");
    await GET(createRequest());
    expect(getLatestDepth).toHaveBeenCalledWith(undefined);
  });

  it("returns depth by payment method", async () => {
    const res = await GET(createRequest({ type: "byPayment" }));
    const data = await res.json();
    expect(data[0].pay_type).toBe("MTN");
  });

  it("returns depth comparison with period", async () => {
    const res = await GET(createRequest({ type: "comparison", period: "7d" }));
    const data = await res.json();
    expect(data[0].trade_type).toBe("BUY");
  });

  it("returns depth comparison with default period", async () => {
    const { getDepthComparison } = await import("@/lib/queries/depth");
    await GET(createRequest({ type: "comparison" }));
    expect(getDepthComparison).toHaveBeenCalledWith("24h");
  });

  it("returns 400 for invalid type", async () => {
    const res = await GET(createRequest({ type: "invalid" }));
    expect(res.status).toBe(400);
  });
});
