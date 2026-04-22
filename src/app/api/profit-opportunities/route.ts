import { NextRequest, NextResponse } from "next/server";
import {
  analyzeOpportunities,
  type OpportunityParams,
  type AnalysisMode,
} from "@/lib/queries/profit-opportunities";
import { getActiveFiat } from "@/lib/fiat-cookie";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return Math.floor(n);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const capital = Number(body.capital);
  const dateStart = typeof body.dateStart === "string" ? body.dateStart : "";
  const dateEnd = typeof body.dateEnd === "string" ? body.dateEnd : "";

  if (!capital || capital <= 0) {
    return NextResponse.json({ error: "capital doit être > 0" }, { status: 400 });
  }
  if (!DATE_RE.test(dateStart) || !DATE_RE.test(dateEnd)) {
    return NextResponse.json(
      { error: "dateStart et dateEnd doivent être au format YYYY-MM-DD" },
      { status: 400 }
    );
  }
  if (dateEnd < dateStart) {
    return NextResponse.json({ error: "dateEnd doit être >= dateStart" }, { status: 400 });
  }

  const mode: AnalysisMode = body.mode === "weekly" ? "weekly" : "daily";

  const morningStart = clampInt(body.morningStart, 6, 0, 23);
  const morningEnd = clampInt(body.morningEnd, 12, 1, 24);
  const eveningStart = clampInt(body.eveningStart, 18, 0, 23);
  const eveningEnd = clampInt(body.eveningEnd, 24, 1, 24);

  if (mode === "daily") {
    if (morningEnd <= morningStart) {
      return NextResponse.json(
        { error: "morningEnd doit être > morningStart" },
        { status: 400 }
      );
    }
    if (eveningEnd <= eveningStart) {
      return NextResponse.json(
        { error: "eveningEnd doit être > eveningStart" },
        { status: 400 }
      );
    }
  }

  const buyDayOfWeek = clampInt(body.buyDayOfWeek, 1, 0, 6);
  const sellDayOfWeek = clampInt(body.sellDayOfWeek, 6, 0, 6);

  const fiat = typeof body.fiat === "string" && body.fiat ? body.fiat : await getActiveFiat();
  const payType = typeof body.payType === "string" && body.payType ? body.payType : undefined;

  const params: OpportunityParams = {
    fiat,
    dateStart,
    dateEnd,
    mode,
    morningStart,
    morningEnd,
    eveningStart,
    eveningEnd,
    buyDayOfWeek,
    sellDayOfWeek,
    capital,
    payType,
  };

  const result = await analyzeOpportunities(params);
  return NextResponse.json(result);
}
