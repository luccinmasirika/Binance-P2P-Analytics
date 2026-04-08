import { db } from "../db/client";
import { alertConfigs, ads } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const TELEGRAM_API = "https://api.telegram.org/bot";

export async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not set, skipping notification");
    return;
  }

  const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`Telegram API error: ${err}`);
  }
}

export async function checkAlerts() {
  const activeAlerts = await db
    .select()
    .from(alertConfigs)
    .where(eq(alertConfigs.isActive, true));

  if (activeAlerts.length === 0) return;

  // Get latest best BUY and SELL prices
  const bestBuy = await db
    .select({ price: sql<string>`MIN(CAST(${ads.price} AS numeric))` })
    .from(ads)
    .where(
      and(
        eq(ads.tradeType, "BUY"),
        sql`${ads.scrapedAt} > NOW() - INTERVAL '15 minutes'`
      )
    );

  const bestSell = await db
    .select({ price: sql<string>`MAX(CAST(${ads.price} AS numeric))` })
    .from(ads)
    .where(
      and(
        eq(ads.tradeType, "SELL"),
        sql`${ads.scrapedAt} > NOW() - INTERVAL '15 minutes'`
      )
    );

  const buyPrice = bestBuy[0]?.price ? Number(bestBuy[0].price) : null;
  const sellPrice = bestSell[0]?.price ? Number(bestSell[0].price) : null;
  const spread = buyPrice && sellPrice ? sellPrice - buyPrice : null;

  for (const alert of activeAlerts) {
    // Check cooldown
    if (alert.lastTriggeredAt) {
      const cooldownMs = alert.cooldownMinutes * 60 * 1000;
      if (Date.now() - alert.lastTriggeredAt.getTime() < cooldownMs) continue;
    }

    let triggered = false;
    let message = "";

    switch (alert.conditionType) {
      case "spread_above":
        if (spread !== null && spread > Number(alert.threshold)) {
          triggered = true;
          message = `🔔 *${alert.name}*\nSpread USDT/RWF: *${spread.toFixed(2)} RWF*\nBUY: ${buyPrice?.toFixed(2)} | SELL: ${sellPrice?.toFixed(2)}\nSeuil: ${alert.threshold} RWF`;
        }
        break;
      case "price_below":
        if (buyPrice !== null && buyPrice < Number(alert.threshold)) {
          triggered = true;
          message = `🔔 *${alert.name}*\nPrix BUY USDT/RWF: *${buyPrice.toFixed(2)} RWF*\nSeuil: < ${alert.threshold} RWF`;
        }
        break;
      case "price_above":
        if (sellPrice !== null && sellPrice > Number(alert.threshold)) {
          triggered = true;
          message = `🔔 *${alert.name}*\nPrix SELL USDT/RWF: *${sellPrice.toFixed(2)} RWF*\nSeuil: > ${alert.threshold} RWF`;
        }
        break;
    }

    if (triggered) {
      await sendTelegramMessage(alert.telegramChatId, message);
      await db
        .update(alertConfigs)
        .set({ lastTriggeredAt: new Date() })
        .where(eq(alertConfigs.id, alert.id));
      console.log(`  Alert triggered: ${alert.name}`);
    }
  }
}
