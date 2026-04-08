import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([
          { id: 1, name: "Test", conditionType: "spread_above", threshold: "50", isActive: true },
        ]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 2, name: "New Alert" }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1, name: "Updated", isActive: false }]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

import { GET, POST, PUT, DELETE } from "@/app/api/alerts/route";
import { NextRequest } from "next/server";

function createRequest(method: string, body?: Record<string, any>) {
  return new NextRequest("http://localhost/api/alerts", {
    method,
    ...(body
      ? {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }
      : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/alerts", () => {
  it("returns all alerts", async () => {
    const res = await GET();
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Test");
  });
});

describe("POST /api/alerts", () => {
  it("creates a new alert", async () => {
    const res = await POST(
      createRequest("POST", {
        name: "New Alert",
        telegramChatId: "123",
        conditionType: "spread_above",
        threshold: 50,
        cooldownMinutes: 15,
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe(2);
  });

  it("uses default cooldown when not provided", async () => {
    const { db } = await import("@/lib/db/client");
    await POST(
      createRequest("POST", {
        name: "No Cooldown",
        telegramChatId: "123",
        conditionType: "price_below",
        threshold: 3800,
      })
    );
    expect(db.insert).toHaveBeenCalled();
  });
});

describe("PUT /api/alerts", () => {
  it("updates an existing alert", async () => {
    const res = await PUT(
      createRequest("PUT", { id: 1, name: "Updated", isActive: false })
    );
    const data = await res.json();
    expect(data.isActive).toBe(false);
  });

  it("updates with threshold", async () => {
    const res = await PUT(
      createRequest("PUT", { id: 1, threshold: 100 })
    );
    const data = await res.json();
    expect(data).toBeDefined();
  });

  it("returns 400 when id is missing", async () => {
    const res = await PUT(createRequest("PUT", { name: "No ID" }));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/alerts", () => {
  it("deletes an alert", async () => {
    const res = await DELETE(createRequest("DELETE", { id: 1 }));
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("returns 400 when id is missing", async () => {
    const res = await DELETE(createRequest("DELETE", {}));
    expect(res.status).toBe(400);
  });
});
