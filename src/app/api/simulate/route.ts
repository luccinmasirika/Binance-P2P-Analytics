import { NextRequest, NextResponse } from "next/server";
import { runSimulation, type SimulationParams } from "@/lib/queries/simulate";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const params: SimulationParams = {
    capital: Number(body.capital),
    paymentMethods: body.paymentMethods || [],
    hoursPerDay: Number(body.hoursPerDay),
    minutesPerTrade: Number(body.minutesPerTrade),
    startDate: body.startDate,
    endDate: body.endDate,
    priceStrategy: Number(body.priceStrategy) as 1 | 2 | 3,
  };

  if (!params.capital || !params.startDate || !params.endDate) {
    return NextResponse.json(
      { error: "capital, startDate, endDate are required" },
      { status: 400 }
    );
  }

  const result = await runSimulation(params);
  return NextResponse.json(result);
}
