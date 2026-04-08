import { NextRequest, NextResponse } from "next/server";
import { getRecentAds, getAdPaymentMethods, getDistinctPaymentMethods } from "@/lib/queries/ads";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tradeType = params.get("tradeType") as "BUY" | "SELL" | null;
  const period = params.get("period") as "24h" | "7d" | "30d" | null;
  const limit = params.get("limit") ? Number(params.get("limit")) : 50;
  const offset = params.get("offset") ? Number(params.get("offset")) : 0;

  // If requesting payment methods list
  if (params.get("paymentMethods") === "true") {
    const methods = await getDistinctPaymentMethods();
    return NextResponse.json(methods);
  }

  const fiat = params.get("fiat") || undefined;
  const payType = params.get("payType") || undefined;

  const adsData = await getRecentAds({
    fiat,
    tradeType: tradeType ?? undefined,
    payType,
    period: period ?? "24h",
    limit,
    offset,
  });

  const adIds = adsData.map((a) => a.id);
  const payMethods = await getAdPaymentMethods(adIds);

  const adsWithMethods = adsData.map((ad) => ({
    ...ad,
    paymentMethods: payMethods
      .filter((pm) => pm.adId === ad.id)
      .map((pm) => ({ payType: pm.payType, name: pm.payMethodName })),
  }));

  return NextResponse.json(adsWithMethods);
}
