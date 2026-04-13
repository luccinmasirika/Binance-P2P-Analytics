/**
 * Mobile money & bank transfer fees in Rwanda.
 *
 * Sources:
 *  - MTN MoMo: https://www.mtn.co.rw/momo-tarrif/  (extracted 2026-04)
 *  - Equity Bank Rwanda: tariff guide effective 2026-04-23 (extracted from PDF)
 *  - Airtel Money: site is JS-only, no public PDF — we proxy the MTN tier table.
 *    Historically Airtel and MTN Rwanda tariffs are within a few percent of
 *    each other. Replace with the real tier table when available.
 *
 * All amounts are in RWF.
 */

export interface FeeTier {
  /** Inclusive lower bound. */
  min: number;
  /** Inclusive upper bound. Use Infinity for the last tier. */
  max: number;
  /** Flat fee for amounts in this tier, in RWF. */
  fee: number;
}

/**
 * MTN MoMo P2P send (on-net = MTN→MTN). Source table 0, "P2P On-net" column.
 * Charged to the SENDER when transferring money to another MoMo wallet.
 */
const MTN_P2P_SEND_TIERS: FeeTier[] = [
  { min: 1,         max: 1_000,      fee: 20 },
  { min: 1_001,     max: 10_000,     fee: 100 },
  { min: 10_001,    max: 150_000,    fee: 250 },
  { min: 150_001,   max: 2_000_000,  fee: 1_500 },
  { min: 2_000_001, max: 5_000_000,  fee: 3_000 },
  { min: 5_000_001, max: 10_000_000, fee: 5_000 },
];

/**
 * MTN MoMo cash-out at agent. Source table 1, "Withdraw" column.
 * Charged to the RECEIVER when withdrawing the received money to cash.
 */
const MTN_CASHOUT_TIERS: FeeTier[] = [
  { min: 1,          max: 100,         fee: 50 },
  { min: 101,        max: 300,         fee: 50 },
  { min: 301,        max: 1_000,       fee: 100 },
  { min: 1_001,      max: 3_000,       fee: 200 },
  { min: 3_001,      max: 5_000,       fee: 250 },
  { min: 5_001,      max: 10_000,      fee: 275 },
  { min: 10_001,     max: 20_000,      fee: 350 },
  { min: 20_001,     max: 40_000,      fee: 600 },
  { min: 40_001,     max: 75_000,      fee: 1_100 },
  { min: 75_001,     max: 150_000,     fee: 2_000 },
  { min: 150_001,    max: 300_000,     fee: 3_000 },
  { min: 300_001,    max: 500_000,     fee: 6_000 },
  { min: 500_001,    max: 1_000_000,   fee: 9_000 },
  { min: 1_000_001,  max: 2_000_000,   fee: 17_000 },
  { min: 2_000_001,  max: 5_000_000,   fee: 25_000 },
  { min: 5_000_001,  max: 8_000_000,   fee: 30_000 },
  { min: 8_000_001,  max: 10_000_000,  fee: 35_000 },
];

/**
 * Equity Bank Rwanda — outgoing local transfer (EFT) approximation.
 * The published guide uses flat charges for outgoing EFT in local currency.
 * TODO: refine when we have the per-tier breakdown extracted from the PDF.
 */
const EQUITY_OUTGOING_LOCAL_TIERS: FeeTier[] = [
  { min: 1,          max: 1_000_000,   fee: 600 },
  { min: 1_000_001,  max: 10_000_000,  fee: 1_500 },
  { min: 10_000_001, max: Infinity,    fee: 5_000 },
];

/**
 * Equity Bank Rwanda — over-the-counter withdrawal.
 * Approximation from the tariff guide ("retrait au guichet"): 800 RWF for
 * amounts ≤ 200k, 400 RWF above. Encoded as flat tiers.
 */
const EQUITY_WITHDRAW_TIERS: FeeTier[] = [
  { min: 1,          max: 200_000,     fee: 800 },
  { min: 200_001,    max: Infinity,    fee: 400 },
];

/** Provider buckets — each pay_type maps to one of these. */
const PROVIDER_TIERS = {
  mtn: { send: MTN_P2P_SEND_TIERS, receive: MTN_CASHOUT_TIERS },
  equity: { send: EQUITY_OUTGOING_LOCAL_TIERS, receive: EQUITY_WITHDRAW_TIERS },
  // Airtel proxy = MTN tier table. Replace with real Airtel data when we have it.
  airtel: { send: MTN_P2P_SEND_TIERS, receive: MTN_CASHOUT_TIERS },
} as const;

type Provider = keyof typeof PROVIDER_TIERS;

/**
 * Maps a Binance P2P pay_type code to a fee provider. Unknown codes return
 * undefined and are treated as fee-free (with a warning logged downstream).
 */
export function payTypeProvider(payType: string | null | undefined): Provider | undefined {
  if (!payType) return undefined;
  switch (payType) {
    case "MTNMobileMoney":
    case "MoMoNew":
      return "mtn";
    case "airtelmoney":
      return "airtel";
    case "EquityBank":
    case "BANK":
    case "Ecobank":
    case "CashDeposit":
      return "equity";
    default:
      return undefined;
  }
}

function lookupTier(tiers: FeeTier[], amount: number): number {
  if (amount <= 0) return 0;
  for (const t of tiers) {
    if (amount >= t.min && amount <= t.max) return t.fee;
  }
  // Above the highest tier: use the last fee.
  return tiers[tiers.length - 1]?.fee ?? 0;
}

/**
 * Fee paid by the SENDER when transferring `amountRwf` of RWF.
 *
 * For a P2P USDT trader BUYING USDT: this is the cost on top of the trade
 * price — you send RWF to the seller and pay this fee to your provider.
 */
export function calculateSendFee(payType: string | null | undefined, amountRwf: number): number {
  const provider = payTypeProvider(payType);
  if (!provider) return 0;
  return lookupTier(PROVIDER_TIERS[provider].send, amountRwf);
}

/**
 * Fee paid by the RECEIVER when getting `amountRwf` of RWF and withdrawing
 * it to cash (or withdrawing from the bank).
 *
 * For a P2P USDT trader SELLING USDT: this is the cost subtracted from your
 * received RWF before you actually have liquid money in hand.
 */
export function calculateReceiveFee(payType: string | null | undefined, amountRwf: number): number {
  const provider = payTypeProvider(payType);
  if (!provider) return 0;
  return lookupTier(PROVIDER_TIERS[provider].receive, amountRwf);
}

/**
 * Total round-trip fee (send + receive) for one buy-sell cycle on the same
 * `amountRwf` and provider. Used by the simulator which models full cycles.
 */
export function calculateFee(payType: string | null | undefined, amountRwf: number): number {
  return calculateSendFee(payType, amountRwf) + calculateReceiveFee(payType, amountRwf);
}

// ──────────────────────────────────────────────────────────────────────────
// Backward-compat: some legacy callers import `MOBILE_MONEY_FEES` and
// `FeeStructure`. Keep stub exports so existing imports don't break.
// ──────────────────────────────────────────────────────────────────────────
export type FeeStructure =
  | { type: "fixed"; amount: number; currency: string }
  | { type: "percentage"; rate: number };

export const MOBILE_MONEY_FEES: Record<string, FeeStructure> = {
  MTNMobileMoney: { type: "fixed", amount: 100, currency: "RWF" },
  airtelmoney: { type: "fixed", amount: 100, currency: "RWF" },
  EquityBank: { type: "fixed", amount: 600, currency: "RWF" },
};
