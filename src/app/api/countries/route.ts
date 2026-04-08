import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { countries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Pre-defined countries that can be added in one click
const AVAILABLE_COUNTRIES = [
  { fiat: "RWF", name: "Rwanda", currencySymbol: "Fr", payTypes: ["MTNMobileMoney", "EquityBank", "BANK", "MoMoNew", "airtelmoney"] },
  { fiat: "KES", name: "Kenya", currencySymbol: "KSh", payTypes: ["MPesaKenya", "BANK", "EquityBank", "airtelmoney", "MpesaPaybill"] },
  { fiat: "UGX", name: "Uganda", currencySymbol: "USh", payTypes: ["airtelmoney", "MTNMobileMoney", "MoMoNew", "Chippercash", "BANK"] },
];

export async function GET() {
  try {
    const active = await db.select().from(countries).orderBy(countries.name);
    return NextResponse.json({ active, available: AVAILABLE_COUNTRIES });
  } catch (err) {
    console.error("Failed to fetch countries:", err);
    return NextResponse.json({ active: [], available: AVAILABLE_COUNTRIES });
  }
}

export async function POST(request: NextRequest) {
  const { fiat } = await request.json();

  const preset = AVAILABLE_COUNTRIES.find((c) => c.fiat === fiat);
  if (!preset) {
    return NextResponse.json({ error: "Unknown country fiat code" }, { status: 400 });
  }

  const [country] = await db
    .insert(countries)
    .values({
      fiat: preset.fiat,
      name: preset.name,
      currencySymbol: preset.currencySymbol,
      payTypes: preset.payTypes,
    })
    .onConflictDoUpdate({
      target: countries.fiat,
      set: {
        isActive: true,
        name: preset.name,
        currencySymbol: preset.currencySymbol,
        payTypes: preset.payTypes,
      },
    })
    .returning();

  return NextResponse.json(country, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { fiat, isActive } = await request.json();

  if (!fiat) {
    return NextResponse.json({ error: "fiat required" }, { status: 400 });
  }

  const [updated] = await db
    .update(countries)
    .set({ isActive })
    .where(eq(countries.fiat, fiat))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const { fiat } = await request.json();

  if (!fiat) {
    return NextResponse.json({ error: "fiat required" }, { status: 400 });
  }

  await db.delete(countries).where(eq(countries.fiat, fiat));
  return NextResponse.json({ success: true });
}
