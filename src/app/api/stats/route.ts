import { NextRequest, NextResponse } from "next/server";
import { getCurrentStats, getPriceHistory, getSpreadHistory, getHeatmapData } from "@/lib/queries/stats";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "current";
  const period = params.get("period") || "24h";
  const fiat = params.get("fiat") || "RWF";
  const payType = params.get("payType") || undefined;
  const granularity = params.get("granularity") || "hour";

  switch (type) {
    case "current":
      return NextResponse.json(await getCurrentStats(fiat, payType));
    case "price":
      return NextResponse.json(await getPriceHistory(period, fiat, payType, granularity));
    case "spread":
      return NextResponse.json(await getSpreadHistory(period, fiat, payType, granularity));
    case "heatmap":
      return NextResponse.json(await getHeatmapData(fiat, payType));
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
