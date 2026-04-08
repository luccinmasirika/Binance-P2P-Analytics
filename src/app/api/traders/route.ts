import { NextRequest, NextResponse } from "next/server";
import { getTopTraders, getTraderProfile, getTraderHourlyPatterns, getMarketMakers } from "@/lib/queries/traders";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "top";
  const userNo = params.get("userNo");

  switch (type) {
    case "top":
      return NextResponse.json(await getTopTraders(Number(params.get("limit")) || 20));
    case "profile":
      if (!userNo) return NextResponse.json({ error: "userNo required" }, { status: 400 });
      return NextResponse.json(await getTraderProfile(userNo));
    case "patterns":
      if (!userNo) return NextResponse.json({ error: "userNo required" }, { status: 400 });
      return NextResponse.json(await getTraderHourlyPatterns(userNo));
    case "marketMakers":
      return NextResponse.json(await getMarketMakers());
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
