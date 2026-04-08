import { describe, it, expect } from "vitest";
import {
  TradeMethodSchema,
  AdvSchema,
  AdvertiserSchema,
  AdItemSchema,
  BinanceP2PResponseSchema,
} from "@/lib/scraper/types";

const validTradeMethod = {
  payType: "MTNMobileMoney",
  tradeMethodName: "MTN Mobile Money",
  tradeMethodShortName: "MTN MoMo",
  identifier: "MTNMobileMoney",
};

const validAdv = {
  advNo: "abc123",
  tradeType: "BUY" as const,
  asset: "USDT",
  fiatUnit: "RWF",
  price: "3850.00",
  surplusAmount: "500.00",
  maxSingleTransAmount: "5000000.00",
  minSingleTransAmount: "10000.00",
  tradableQuantity: "500.00",
  payTimeLimit: 15,
  tradeMethods: [validTradeMethod],
};

const validAdvertiser = {
  userNo: "s123abc",
  nickName: "TraderX",
  monthOrderCount: 150,
  monthFinishRate: 0.98,
  positiveRate: 1.0,
  userType: "user",
};

describe("TradeMethodSchema", () => {
  it("parses valid trade method", () => {
    const result = TradeMethodSchema.parse(validTradeMethod);
    expect(result.identifier).toBe("MTNMobileMoney");
    expect(result.payType).toBe("MTNMobileMoney");
  });

  it("accepts null payType and tradeMethodName", () => {
    const result = TradeMethodSchema.parse({
      ...validTradeMethod,
      payType: null,
      tradeMethodName: null,
      tradeMethodShortName: null,
    });
    expect(result.payType).toBeNull();
    expect(result.tradeMethodName).toBeNull();
  });

  it("rejects missing identifier", () => {
    expect(() =>
      TradeMethodSchema.parse({ ...validTradeMethod, identifier: undefined })
    ).toThrow();
  });
});

describe("AdvSchema", () => {
  it("parses valid adv and converts string prices to numbers", () => {
    const result = AdvSchema.parse(validAdv);
    expect(result.price).toBe(3850);
    expect(result.surplusAmount).toBe(500);
    expect(result.maxSingleTransAmount).toBe(5000000);
    expect(result.minSingleTransAmount).toBe(10000);
    expect(result.tradableQuantity).toBe(500);
    expect(result.tradeType).toBe("BUY");
  });

  it("accepts SELL tradeType", () => {
    const result = AdvSchema.parse({ ...validAdv, tradeType: "SELL" });
    expect(result.tradeType).toBe("SELL");
  });

  it("rejects invalid tradeType", () => {
    expect(() => AdvSchema.parse({ ...validAdv, tradeType: "HOLD" })).toThrow();
  });

  it("handles empty tradeMethods array", () => {
    const result = AdvSchema.parse({ ...validAdv, tradeMethods: [] });
    expect(result.tradeMethods).toHaveLength(0);
  });
});

describe("AdvertiserSchema", () => {
  it("parses valid advertiser", () => {
    const result = AdvertiserSchema.parse(validAdvertiser);
    expect(result.userNo).toBe("s123abc");
    expect(result.nickName).toBe("TraderX");
    expect(result.monthOrderCount).toBe(150);
  });

  it("accepts null userType", () => {
    const result = AdvertiserSchema.parse({ ...validAdvertiser, userType: null });
    expect(result.userType).toBeNull();
  });

  it("accepts optional isOnline", () => {
    const result = AdvertiserSchema.parse({ ...validAdvertiser, isOnline: true });
    expect(result.isOnline).toBe(true);
  });

  it("works without isOnline field", () => {
    const result = AdvertiserSchema.parse(validAdvertiser);
    expect(result.isOnline).toBeUndefined();
  });
});

describe("AdItemSchema", () => {
  it("parses valid ad item", () => {
    const result = AdItemSchema.parse({ adv: validAdv, advertiser: validAdvertiser });
    expect(result.adv.advNo).toBe("abc123");
    expect(result.advertiser.userNo).toBe("s123abc");
  });
});

describe("BinanceP2PResponseSchema", () => {
  it("parses valid response", () => {
    const response = {
      code: "000000",
      data: [{ adv: validAdv, advertiser: validAdvertiser }],
      total: 1,
    };
    const result = BinanceP2PResponseSchema.parse(response);
    expect(result.code).toBe("000000");
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("parses empty data array", () => {
    const result = BinanceP2PResponseSchema.parse({
      code: "000000",
      data: [],
      total: 0,
    });
    expect(result.data).toHaveLength(0);
  });

  it("rejects missing code", () => {
    expect(() =>
      BinanceP2PResponseSchema.parse({ data: [], total: 0 })
    ).toThrow();
  });
});
