import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/queries/simulate", () => ({
  runSimulation: vi.fn().mockResolvedValue({
    totalProfit: 5000,
    avgDailyProfit: 714,
    roiPercent: 5,
    bestDay: null,
    worstDay: null,
    totalCycles: 10,
    dailyProfits: [],
    hourlyOptimal: [],
  }),
}));

import { POST } from "@/app/api/simulate/route";
import { runSimulation } from "@/lib/queries/simulate";
import { NextRequest } from "next/server";

function createRequest(body: Record<string, any>) {
  return new NextRequest("http://localhost/api/simulate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/simulate", () => {
  it("runs simulation with valid params", async () => {
    const res = await POST(
      createRequest({
        capital: 100000,
        paymentMethods: ["MTNMobileMoney"],
        hoursPerDay: 4,
        minutesPerTrade: 20,
        startDate: "2024-01-01",
        endDate: "2024-01-07",
        priceStrategy: 2,
      })
    );
    const data = await res.json();
    expect(data.totalProfit).toBe(5000);
    expect(runSimulation).toHaveBeenCalledWith(
      expect.objectContaining({
        capital: 100000,
        priceStrategy: 2,
      })
    );
  });

  it("returns 400 when capital is missing", async () => {
    const res = await POST(
      createRequest({
        startDate: "2024-01-01",
        endDate: "2024-01-07",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when startDate is missing", async () => {
    const res = await POST(
      createRequest({
        capital: 100000,
        endDate: "2024-01-07",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when endDate is missing", async () => {
    const res = await POST(
      createRequest({
        capital: 100000,
        startDate: "2024-01-01",
      })
    );
    expect(res.status).toBe(400);
  });

  it("defaults paymentMethods to empty array", async () => {
    await POST(
      createRequest({
        capital: 100000,
        startDate: "2024-01-01",
        endDate: "2024-01-07",
        hoursPerDay: 4,
        minutesPerTrade: 20,
        priceStrategy: 1,
      })
    );
    expect(runSimulation).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethods: [] })
    );
  });
});
