import { describe, it, expect } from "vitest";
import { calculateFee, MOBILE_MONEY_FEES } from "@/lib/constants/fees";

describe("MOBILE_MONEY_FEES", () => {
  it("defines MTNMobileMoney as fixed 20 RWF", () => {
    const fee = MOBILE_MONEY_FEES.MTNMobileMoney;
    expect(fee).toEqual({ type: "fixed", amount: 20, currency: "RWF" });
  });

  it("defines AirtelMoney as fixed 20 RWF", () => {
    const fee = MOBILE_MONEY_FEES.AirtelMoney;
    expect(fee).toEqual({ type: "fixed", amount: 20, currency: "RWF" });
  });

  it("defines BankTransfer as 2% percentage", () => {
    const fee = MOBILE_MONEY_FEES.BankTransfer;
    expect(fee).toEqual({ type: "percentage", rate: 0.02 });
  });
});

describe("calculateFee", () => {
  it("returns fixed fee for MTNMobileMoney regardless of amount", () => {
    expect(calculateFee("MTNMobileMoney", 100000)).toBe(20);
    expect(calculateFee("MTNMobileMoney", 500000)).toBe(20);
    expect(calculateFee("MTNMobileMoney", 1)).toBe(20);
  });

  it("returns fixed fee for AirtelMoney", () => {
    expect(calculateFee("AirtelMoney", 200000)).toBe(20);
  });

  it("returns percentage fee for BankTransfer", () => {
    expect(calculateFee("BankTransfer", 100000)).toBe(2000);
    expect(calculateFee("BankTransfer", 50000)).toBe(1000);
  });

  it("returns 0 for unknown payment type", () => {
    expect(calculateFee("UnknownPay", 100000)).toBe(0);
  });

  it("returns 0 for empty string payment type", () => {
    expect(calculateFee("", 100000)).toBe(0);
  });
});
