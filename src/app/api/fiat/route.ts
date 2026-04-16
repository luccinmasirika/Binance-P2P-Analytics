import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { countries } from "@/lib/db/schema";
import { setActiveFiatCookie } from "@/lib/fiat-cookie";

export async function POST(request: NextRequest) {
  const { fiat } = await request.json();

  if (typeof fiat !== "string" || !fiat) {
    return NextResponse.json({ error: "fiat required" }, { status: 400 });
  }

  const [row] = await db
    .select({ fiat: countries.fiat })
    .from(countries)
    .where(and(eq(countries.fiat, fiat), eq(countries.isActive, true)))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { error: "Unknown or inactive fiat" },
      { status: 400 }
    );
  }

  await setActiveFiatCookie(row.fiat);
  return NextResponse.json({ fiat: row.fiat });
}
