import { NextRequest, NextResponse } from "next/server";
import { getLatestDepth, getDepthByPaymentMethod, getDepthComparison } from "@/lib/queries/depth";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type") || "current";
  const tradeType = params.get("tradeType") as "BUY" | "SELL" | null;

  switch (type) {
    case "current":
      return NextResponse.json(await getLatestDepth(tradeType ?? undefined));
    case "byPayment":
      return NextResponse.json(await getDepthByPaymentMethod());
    case "comparison":
      return NextResponse.json(
        await getDepthComparison((params.get("period") as "24h" | "7d") || "24h")
      );
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
