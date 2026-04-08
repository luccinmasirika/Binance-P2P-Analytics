import { BinanceP2PResponseSchema, type BinanceP2PResponse } from "./types";
const BINANCE_P2P_URL =
  "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";

const HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "clienttype": "web",
  "c2ctype": "c2c_web",
  "Origin": "https://p2p.binance.com",
  "Referer": "https://p2p.binance.com/",
};

export async function fetchAds(params: {
  fiat: string;
  countryCode?: string;
  tradeType: "BUY" | "SELL";
  page?: number;
  rows?: number;
  payTypes?: string[];
}): Promise<BinanceP2PResponse> {
  const body = {
    fiat: params.fiat,
    page: params.page ?? 1,
    rows: params.rows ?? 20,
    tradeType: params.tradeType,
    asset: "USDT",
    countries: params.countryCode ? [params.countryCode] : [],
    proMerchantAds: false,
    shieldMerchantAds: false,
    filterType: "all",
    periods: [],
    additionalKycVerifyFilter: 0,
    publisherType: null,
    payTypes: params.payTypes ?? [],
    classifies: ["mass", "profession", "fiat_trade"],
    tradedWith: false,
    followed: false,
  };

  const response = await fetch(BINANCE_P2P_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Binance P2P API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const parsed = BinanceP2PResponseSchema.parse(json);

  if (parsed.code !== "000000") {
    throw new Error(`Binance P2P API returned code: ${parsed.code}`);
  }

  return parsed;
}

export async function fetchAllAds(
  fiat: string,
  tradeType: "BUY" | "SELL",
  countryCode?: string,
  payTypes?: string[]
): Promise<BinanceP2PResponse["data"]> {
  const allAds: BinanceP2PResponse["data"] = [];
  let page = 1;

  while (true) {
    const res = await fetchAds({ fiat, countryCode, tradeType, page, rows: 20, payTypes });
    allAds.push(...res.data);

    if (res.data.length === 0 || page * 20 >= res.total) break;

    page++;
    await sleep(300);
  }

  return allAds;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
