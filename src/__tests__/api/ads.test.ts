import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/queries/ads", () => ({
  getRecentAds: vi.fn().mockResolvedValue([
    { id: 1, advNo: "ad1", tradeType: "BUY", price: "3850" },
  ]),
  getAdPaymentMethods: vi.fn().mockResolvedValue([
    { adId: 1, payType: "MTN", payMethodName: "MTN Mobile Money" },
  ]),
  getDistinctPaymentMethods: vi.fn().mockResolvedValue([
    { payType: "MTN", payMethodName: "MTN Mobile Money" },
  ]),
}));

import { GET } from "@/app/api/ads/route";
import { getRecentAds, getDistinctPaymentMethods } from "@/lib/queries/ads";
import { NextRequest } from "next/server";

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/ads");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/ads", () => {
  it("returns ads with payment methods", async () => {
    const response = await GET(createRequest());
    const data = await response.json();

    expect(data).toHaveLength(1);
    expect(data[0].paymentMethods).toHaveLength(1);
    expect(getRecentAds).toHaveBeenCalled();
  });

  it("passes tradeType filter", async () => {
    await GET(createRequest({ tradeType: "SELL" }));
    expect(getRecentAds).toHaveBeenCalledWith(
      expect.objectContaining({ tradeType: "SELL" })
    );
  });

  it("passes period filter", async () => {
    await GET(createRequest({ period: "7d" }));
    expect(getRecentAds).toHaveBeenCalledWith(
      expect.objectContaining({ period: "7d" })
    );
  });

  it("passes limit and offset", async () => {
    await GET(createRequest({ limit: "10", offset: "5" }));
    expect(getRecentAds).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 5 })
    );
  });

  it("returns payment methods list when requested", async () => {
    const response = await GET(createRequest({ paymentMethods: "true" }));
    const data = await response.json();

    expect(data).toHaveLength(1);
    expect(data[0].payType).toBe("MTN");
    expect(getDistinctPaymentMethods).toHaveBeenCalled();
  });
});
