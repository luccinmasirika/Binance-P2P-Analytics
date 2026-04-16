import { NextRequest, NextResponse } from "next/server";
import {
  getTopTraders,
  getTraderProfile,
  getTraderHourlyPatterns,
  getMarketMakers,
} from "@/lib/queries/traders";
import { getActiveFiat } from "@/lib/fiat-cookie";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "top";
  const userNo = params.get("userNo");
  const fiat = params.get("fiat") || (await getActiveFiat());

  switch (type) {
    case "top":
      return NextResponse.json(
        await getTopTraders(fiat, Number(params.get("limit")) || 20)
      );
    case "profile":
      if (!userNo)
        return NextResponse.json({ error: "userNo required" }, { status: 400 });
      return NextResponse.json(await getTraderProfile(userNo, fiat));
    case "patterns":
      if (!userNo)
        return NextResponse.json({ error: "userNo required" }, { status: 400 });
      return NextResponse.json(await getTraderHourlyPatterns(userNo, fiat));
    case "marketMakers":
      return NextResponse.json(await getMarketMakers(fiat));
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
