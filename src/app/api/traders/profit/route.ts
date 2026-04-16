import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  estimateAllTradersProfit,
  estimateTraderProfit,
  inferFillsForTrader,
} from "@/lib/queries/trader-profit";
import { getActiveFiat } from "@/lib/fiat-cookie";

const QuerySchema = z.object({
  userNo: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  withFills: z.enum(["true", "false"]).optional(),
  payType: z.string().optional(),
  fiat: z.string().optional(),
});

function defaultRange(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from, to };
}

export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { userNo, from, to, limit, withFills, payType, fiat: fiatParam } =
    parsed.data;
  const fiat = fiatParam ?? (await getActiveFiat());
  const fallback = defaultRange();
  const startDate = from ? new Date(from) : fallback.from;
  const endDate = to ? new Date(to) : fallback.to;
  const payTypeFilter = payType && payType !== "all" ? payType : null;

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid 'from' or 'to' date" },
      { status: 400 }
    );
  }

  if (userNo) {
    const estimate = await estimateTraderProfit(
      userNo,
      startDate,
      endDate,
      fiat,
      payTypeFilter
    );
    if (!estimate) {
      return NextResponse.json({ estimate: null, fills: [] });
    }
    const fills =
      withFills === "true"
        ? await inferFillsForTrader(
            userNo,
            startDate,
            endDate,
            fiat,
            payTypeFilter
          )
        : undefined;
    return NextResponse.json({ estimate, fills });
  }

  const estimates = await estimateAllTradersProfit(
    startDate,
    endDate,
    fiat,
    limit ?? 50,
    payTypeFilter
  );
  return NextResponse.json({ estimates });
}
