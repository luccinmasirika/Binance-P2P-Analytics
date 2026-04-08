import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { alertConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const alerts = await db.select().from(alertConfigs).orderBy(alertConfigs.createdAt);
  return NextResponse.json(alerts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const [alert] = await db
    .insert(alertConfigs)
    .values({
      name: body.name,
      telegramChatId: body.telegramChatId,
      conditionType: body.conditionType,
      threshold: String(body.threshold),
      payTypes: body.payTypes || null,
      cooldownMinutes: body.cooldownMinutes || 30,
    })
    .returning();

  return NextResponse.json(alert, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const [updated] = await db
    .update(alertConfigs)
    .set({
      name: body.name,
      telegramChatId: body.telegramChatId,
      conditionType: body.conditionType,
      threshold: body.threshold ? String(body.threshold) : undefined,
      payTypes: body.payTypes,
      isActive: body.isActive,
      cooldownMinutes: body.cooldownMinutes,
    })
    .where(eq(alertConfigs.id, body.id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db.delete(alertConfigs).where(eq(alertConfigs.id, id));
  return NextResponse.json({ success: true });
}
