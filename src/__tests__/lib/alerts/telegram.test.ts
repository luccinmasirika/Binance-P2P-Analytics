import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

import { sendTelegramMessage, checkAlerts } from "@/lib/alerts/telegram";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("sendTelegramMessage", () => {
  it("sends message via Telegram API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    await sendTelegramMessage("123", "Hello");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/sendMessage"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"chat_id":"123"'),
      })
    );
  });

  it("logs error on failed Telegram API call", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve("Unauthorized"),
      })
    );

    await sendTelegramMessage("123", "Hello");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Telegram API error"));
  });

  it("skips when TELEGRAM_BOT_TOKEN is not set", async () => {
    const origToken = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn());

    await sendTelegramMessage("123", "Hello");
    expect(fetch).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    process.env.TELEGRAM_BOT_TOKEN = origToken;
  });
});

describe("checkAlerts", () => {
  it("returns early when no active alerts", async () => {
    const { db } = await import("@/lib/db/client");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    await checkAlerts();
  });

  it("triggers spread_above alert when spread exceeds threshold", async () => {
    const { db } = await import("@/lib/db/client");

    let callCount = 0;
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([{
              id: 1, name: "Test Alert", telegramChatId: "123",
              conditionType: "spread_above", threshold: "50",
              asset: "USDT", payTypes: null, isActive: true,
              lastTriggeredAt: null, cooldownMinutes: 30, createdAt: new Date(),
            }]);
          }
          if (callCount === 2) return Promise.resolve([{ price: "3800" }]);
          if (callCount === 3) return Promise.resolve([{ price: "3900" }]);
          return Promise.resolve([]);
        }),
      }),
    } as any);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    await checkAlerts();
    expect(fetch).toHaveBeenCalled();
  });

  it("triggers price_below alert", async () => {
    const { db } = await import("@/lib/db/client");
    let callCount = 0;
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve([{
            id: 1, name: "Low", telegramChatId: "123", conditionType: "price_below",
            threshold: "3900", asset: "USDT", payTypes: null, isActive: true,
            lastTriggeredAt: null, cooldownMinutes: 30, createdAt: new Date(),
          }]);
          if (callCount === 2) return Promise.resolve([{ price: "3800" }]);
          if (callCount === 3) return Promise.resolve([{ price: "3900" }]);
          return Promise.resolve([]);
        }),
      }),
    } as any);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    await checkAlerts();
    expect(fetch).toHaveBeenCalled();
  });

  it("triggers price_above alert", async () => {
    const { db } = await import("@/lib/db/client");
    let callCount = 0;
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve([{
            id: 1, name: "High", telegramChatId: "123", conditionType: "price_above",
            threshold: "3850", asset: "USDT", payTypes: null, isActive: true,
            lastTriggeredAt: null, cooldownMinutes: 30, createdAt: new Date(),
          }]);
          if (callCount === 2) return Promise.resolve([{ price: "3800" }]);
          if (callCount === 3) return Promise.resolve([{ price: "3900" }]);
          return Promise.resolve([]);
        }),
      }),
    } as any);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    await checkAlerts();
    expect(fetch).toHaveBeenCalled();
  });

  it("respects cooldown period", async () => {
    const { db } = await import("@/lib/db/client");
    let callCount = 0;
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve([{
            id: 1, name: "Cooldown", telegramChatId: "123", conditionType: "spread_above",
            threshold: "10", asset: "USDT", payTypes: null, isActive: true,
            lastTriggeredAt: new Date(), cooldownMinutes: 30, createdAt: new Date(),
          }]);
          if (callCount === 2) return Promise.resolve([{ price: "3800" }]);
          if (callCount === 3) return Promise.resolve([{ price: "3900" }]);
          return Promise.resolve([]);
        }),
      }),
    } as any);

    vi.stubGlobal("fetch", vi.fn());
    await checkAlerts();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not trigger when condition not met", async () => {
    const { db } = await import("@/lib/db/client");
    let callCount = 0;
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve([{
            id: 1, name: "No trigger", telegramChatId: "123", conditionType: "spread_above",
            threshold: "200", asset: "USDT", payTypes: null, isActive: true,
            lastTriggeredAt: null, cooldownMinutes: 30, createdAt: new Date(),
          }]);
          if (callCount === 2) return Promise.resolve([{ price: "3800" }]);
          if (callCount === 3) return Promise.resolve([{ price: "3850" }]);
          return Promise.resolve([]);
        }),
      }),
    } as any);

    vi.stubGlobal("fetch", vi.fn());
    await checkAlerts();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("handles null prices", async () => {
    const { db } = await import("@/lib/db/client");
    let callCount = 0;
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve([{
            id: 1, name: "Null", telegramChatId: "123", conditionType: "spread_above",
            threshold: "10", asset: "USDT", payTypes: null, isActive: true,
            lastTriggeredAt: null, cooldownMinutes: 30, createdAt: new Date(),
          }]);
          if (callCount === 2) return Promise.resolve([{ price: null }]);
          if (callCount === 3) return Promise.resolve([{ price: null }]);
          return Promise.resolve([]);
        }),
      }),
    } as any);

    vi.stubGlobal("fetch", vi.fn());
    await checkAlerts();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not trigger price_below when buy price is above threshold", async () => {
    const { db } = await import("@/lib/db/client");
    let callCount = 0;
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve([{
            id: 1, name: "Above", telegramChatId: "123", conditionType: "price_below",
            threshold: "3700", asset: "USDT", payTypes: null, isActive: true,
            lastTriggeredAt: null, cooldownMinutes: 30, createdAt: new Date(),
          }]);
          if (callCount === 2) return Promise.resolve([{ price: "3800" }]);
          if (callCount === 3) return Promise.resolve([{ price: "3900" }]);
          return Promise.resolve([]);
        }),
      }),
    } as any);

    vi.stubGlobal("fetch", vi.fn());
    await checkAlerts();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not trigger price_above when sell price is below threshold", async () => {
    const { db } = await import("@/lib/db/client");
    let callCount = 0;
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve([{
            id: 1, name: "Below", telegramChatId: "123", conditionType: "price_above",
            threshold: "4000", asset: "USDT", payTypes: null, isActive: true,
            lastTriggeredAt: null, cooldownMinutes: 30, createdAt: new Date(),
          }]);
          if (callCount === 2) return Promise.resolve([{ price: "3800" }]);
          if (callCount === 3) return Promise.resolve([{ price: "3900" }]);
          return Promise.resolve([]);
        }),
      }),
    } as any);

    vi.stubGlobal("fetch", vi.fn());
    await checkAlerts();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("triggers when cooldown has expired", async () => {
    const { db } = await import("@/lib/db/client");
    let callCount = 0;
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve([{
            id: 1, name: "Expired cooldown", telegramChatId: "123",
            conditionType: "spread_above", threshold: "10",
            asset: "USDT", payTypes: null, isActive: true,
            lastTriggeredAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            cooldownMinutes: 30, // 30 min cooldown = expired
            createdAt: new Date(),
          }]);
          if (callCount === 2) return Promise.resolve([{ price: "3800" }]);
          if (callCount === 3) return Promise.resolve([{ price: "3900" }]);
          return Promise.resolve([]);
        }),
      }),
    } as any);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    await checkAlerts();
    expect(fetch).toHaveBeenCalled(); // Should trigger because cooldown expired
  });

  it("handles multiple alerts with different conditions", async () => {
    const { db } = await import("@/lib/db/client");
    let callCount = 0;
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve([
            {
              id: 1, name: "Spread", telegramChatId: "123", conditionType: "spread_above",
              threshold: "50", asset: "USDT", payTypes: null, isActive: true,
              lastTriggeredAt: null, cooldownMinutes: 30, createdAt: new Date(),
            },
            {
              id: 2, name: "Low Buy", telegramChatId: "123", conditionType: "price_below",
              threshold: "3900", asset: "USDT", payTypes: null, isActive: true,
              lastTriggeredAt: null, cooldownMinutes: 30, createdAt: new Date(),
            },
            {
              id: 3, name: "High Sell", telegramChatId: "123", conditionType: "price_above",
              threshold: "3850", asset: "USDT", payTypes: null, isActive: true,
              lastTriggeredAt: null, cooldownMinutes: 30, createdAt: new Date(),
            },
          ]);
          if (callCount === 2) return Promise.resolve([{ price: "3800" }]);
          if (callCount === 3) return Promise.resolve([{ price: "3900" }]);
          return Promise.resolve([]);
        }),
      }),
    } as any);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    await checkAlerts();
    // All 3 alerts should trigger
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
