import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([]),
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/scraper/binance", () => ({
  fetchAllAds: vi.fn(),
}));

vi.mock("@/lib/scraper/forex", () => ({
  fetchForexRate: vi.fn(),
}));

vi.mock("@/lib/alerts/telegram", () => ({
  checkAlerts: vi.fn(),
}));

import { runFullScrape } from "@/lib/scraper/runner";
import { fetchAllAds } from "@/lib/scraper/binance";
import { fetchForexRate } from "@/lib/scraper/forex";
import { checkAlerts } from "@/lib/alerts/telegram";

const mockAdItem = {
  adv: {
    advNo: "ad1", tradeType: "BUY" as const, asset: "USDT", fiatUnit: "RWF",
    price: 3850, surplusAmount: 100, maxSingleTransAmount: 500000,
    minSingleTransAmount: 10000, tradableQuantity: 100, payTimeLimit: 15,
    tradeMethods: [{
      payType: "MTNMobileMoney", tradeMethodName: "MTN",
      tradeMethodShortName: "MTN", identifier: "MTNMobileMoney",
    }],
  },
  advertiser: {
    userNo: "u1", nickName: "Trader1", monthOrderCount: 50,
    monthFinishRate: 0.95, positiveRate: 0.99, userType: "user",
  },
};

async function setupCountriesMock(countries: any[] = [{ id: 1, fiat: "RWF", name: "Rwanda", isActive: true }]) {
  const { db } = await import("@/lib/db/client");
  // First select call = countries query, subsequent = depth queries
  let selectCallCount = 0;
  vi.mocked(db.select).mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
      // countries query
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(countries),
        }),
      } as any;
    }
    // depth queries
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([]),
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any;
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  await setupCountriesMock();
});

describe("runFullScrape", () => {
  it("scrapes ads for active countries", async () => {
    vi.mocked(fetchAllAds).mockResolvedValue([mockAdItem]);
    vi.mocked(fetchForexRate).mockResolvedValue({
      base: "USD", target: "RWF", rate: 1350, source: "frankfurter",
    });
    vi.mocked(checkAlerts).mockResolvedValue(undefined);

    await runFullScrape();

    expect(fetchAllAds).toHaveBeenCalledWith("RWF", "BUY");
    expect(fetchAllAds).toHaveBeenCalledWith("RWF", "SELL");
    expect(fetchForexRate).toHaveBeenCalledWith("RWF");
    expect(checkAlerts).toHaveBeenCalled();
  });

  it("skips when no active countries", async () => {
    await setupCountriesMock([]);

    vi.mocked(fetchAllAds).mockResolvedValue([]);
    await runFullScrape();

    expect(fetchAllAds).not.toHaveBeenCalled();
  });

  it("deduplicates ads by advNo", async () => {
    vi.mocked(fetchAllAds)
      .mockResolvedValueOnce([mockAdItem])
      .mockResolvedValueOnce([mockAdItem]);
    vi.mocked(fetchForexRate).mockResolvedValue({
      base: "USD", target: "RWF", rate: 1350, source: "frankfurter",
    });
    vi.mocked(checkAlerts).mockResolvedValue(undefined);

    await runFullScrape();
  });

  it("handles forex failure gracefully", async () => {
    vi.mocked(fetchAllAds).mockResolvedValue([]);
    vi.mocked(fetchForexRate).mockRejectedValue(new Error("Network"));
    vi.mocked(checkAlerts).mockResolvedValue(undefined);

    await runFullScrape();
  });

  it("handles alert check failure gracefully", async () => {
    vi.mocked(fetchAllAds).mockResolvedValue([]);
    vi.mocked(fetchForexRate).mockResolvedValue({
      base: "USD", target: "RWF", rate: 1350, source: "frankfurter",
    });
    vi.mocked(checkAlerts).mockRejectedValue(new Error("Alert error"));

    await runFullScrape();
  });

  it("marks session failed on scrape error", async () => {
    vi.mocked(fetchAllAds).mockRejectedValue(new Error("API down"));

    await expect(runFullScrape()).rejects.toThrow("API down");
  });

  it("computes depth snapshots when data exists", async () => {
    const { db } = await import("@/lib/db/client");
    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 1, fiat: "RWF", name: "Rwanda", isActive: true }]),
          }),
        } as any;
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([
              { tradeType: "BUY", price: "3850", totalQuantity: "100", adCount: 2 },
            ]),
          }),
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                { tradeType: "BUY", price: "3850", payType: "MTN", totalQuantity: "50", adCount: 1 },
              ]),
            }),
          }),
        }),
      } as any;
    });

    vi.mocked(fetchAllAds).mockResolvedValueOnce([mockAdItem]).mockResolvedValueOnce([]);
    vi.mocked(fetchForexRate).mockResolvedValue({
      base: "USD", target: "RWF", rate: 1350, source: "frankfurter",
    });
    vi.mocked(checkAlerts).mockResolvedValue(undefined);

    await runFullScrape();
    expect(db.insert).toHaveBeenCalled();
  });

  it("handles ads with empty tradeMethods", async () => {
    const adNoMethods = {
      ...mockAdItem,
      adv: { ...mockAdItem.adv, advNo: "ad2", tradeMethods: [] },
    };
    vi.mocked(fetchAllAds).mockResolvedValueOnce([adNoMethods]).mockResolvedValueOnce([]);
    vi.mocked(fetchForexRate).mockResolvedValue({
      base: "USD", target: "RWF", rate: 1350, source: "frankfurter",
    });
    vi.mocked(checkAlerts).mockResolvedValue(undefined);

    await runFullScrape();
  });
});
