import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAds, fetchAllAds } from "@/lib/scraper/binance";

const mockAdItem = {
  adv: {
    advNo: "ad1",
    tradeType: "BUY",
    asset: "USDT",
    fiatUnit: "RWF",
    price: "3850",
    surplusAmount: "100",
    maxSingleTransAmount: "500000",
    minSingleTransAmount: "10000",
    tradableQuantity: "100",
    payTimeLimit: 15,
    tradeMethods: [
      {
        payType: "MTNMobileMoney",
        tradeMethodName: "MTN",
        tradeMethodShortName: "MTN",
        identifier: "MTNMobileMoney",
      },
    ],
  },
  advertiser: {
    userNo: "u1",
    nickName: "Trader1",
    monthOrderCount: 50,
    monthFinishRate: 0.95,
    positiveRate: 0.99,
    userType: "user",
  },
};

const validApiResponse = {
  code: "000000",
  data: [mockAdItem],
  total: 1,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchAds", () => {
  it("fetches and parses ads successfully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validApiResponse),
      })
    );

    const result = await fetchAds({ fiat: "RWF", tradeType: "BUY" });
    expect(result.code).toBe("000000");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].adv.price).toBe(3850);

    expect(fetch).toHaveBeenCalledWith(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"tradeType":"BUY"'),
      })
    );
  });

  it("uses default page and rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validApiResponse),
      })
    );

    await fetchAds({ fiat: "RWF", tradeType: "SELL" });
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.page).toBe(1);
    expect(body.rows).toBe(20);
    expect(body.fiat).toBe("RWF");
    expect(body.asset).toBe("USDT");
  });

  it("passes custom page, rows, payTypes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validApiResponse),
      })
    );

    await fetchAds({ fiat: "RWF", tradeType: "BUY", page: 3, rows: 10, payTypes: ["MTN"] });
    const body = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(body.page).toBe(3);
    expect(body.rows).toBe(10);
    expect(body.payTypes).toEqual(["MTN"]);
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      })
    );

    await expect(fetchAds({ fiat: "RWF", tradeType: "BUY" })).rejects.toThrow(
      "Binance P2P API error: 429 Too Many Requests"
    );
  });

  it("throws on non-000000 code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...validApiResponse, code: "999999" }),
      })
    );

    await expect(fetchAds({ fiat: "RWF", tradeType: "BUY" })).rejects.toThrow(
      "Binance P2P API returned code: 999999"
    );
  });
});

describe("fetchAllAds", () => {
  it("fetches single page when total <= rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validApiResponse),
      })
    );

    const result = await fetchAllAds("BUY");
    expect(result).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("paginates when total > rows", async () => {
    const page1Response = {
      code: "000000",
      data: Array(20).fill(mockAdItem),
      total: 25,
    };
    const page2Response = {
      code: "000000",
      data: Array(5).fill(mockAdItem),
      total: 25,
    };

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page1Response),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page2Response),
        })
    );

    const result = await fetchAllAds("SELL");
    expect(result).toHaveLength(25);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("stops when data array is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ code: "000000", data: [], total: 0 }),
      })
    );

    const result = await fetchAllAds("BUY");
    expect(result).toHaveLength(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
