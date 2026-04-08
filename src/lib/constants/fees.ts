export type FeeStructure =
  | { type: "fixed"; amount: number; currency: string }
  | { type: "percentage"; rate: number };

export const MOBILE_MONEY_FEES: Record<string, FeeStructure> = {
  MTNMobileMoney: { type: "fixed", amount: 20, currency: "RWF" },
  AirtelMoney: { type: "fixed", amount: 20, currency: "RWF" },
  BankTransfer: { type: "percentage", rate: 0.02 },
};

export function calculateFee(payType: string, amount: number): number {
  const fee = MOBILE_MONEY_FEES[payType];
  if (!fee) return 0;

  if (fee.type === "fixed") return fee.amount;
  return amount * fee.rate;
}
