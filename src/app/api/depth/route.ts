import { NextRequest, NextResponse } from "next/server";
import {
  getLatestDepth,
  getDepthByPaymentMethod,
  getDepthComparison,
} from "@/lib/queries/depth";
import { getActiveFiat } from "@/lib/fiat-cookie";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "current";
  const tradeType = params.get("tradeType") as "BUY" | "SELL" | null;
  const fiat = params.get("fiat") || (await getActiveFiat());

  switch (type) {
    case "current":
      return NextResponse.json(
        await getLatestDepth(fiat, tradeType ?? undefined)
      );
    case "byPayment":
      return NextResponse.json(await getDepthByPaymentMethod(fiat));
    case "comparison":
      return NextResponse.json(
        await getDepthComparison(
          fiat,
          (params.get("period") as "24h" | "7d") || "24h"
        )
      );
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
