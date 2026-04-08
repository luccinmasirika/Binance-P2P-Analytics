// Payment methods to scrape — must match exact Binance API payType codes
export const ALLOWED_PAY_TYPES = [
  "MTNMobileMoney",
  "EquityBank",
  "BANK",
  "MoMoNew",
  "airtelmoney",
] as const;

export type AllowedPayType = (typeof ALLOWED_PAY_TYPES)[number];
