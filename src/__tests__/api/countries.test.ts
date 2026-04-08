import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([
          { fiat: "RWF", name: "Rwanda", currencySymbol: "Fr", isActive: true },
        ]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { fiat: "KES", name: "Kenya", currencySymbol: "KSh", isActive: true },
          ]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { fiat: "RWF", isActive: false },
          ]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

import { GET, POST, PUT, DELETE } from "@/app/api/countries/route";
import { NextRequest } from "next/server";

function createRequest(method: string, body?: Record<string, any>) {
  return new NextRequest("http://localhost/api/countries", {
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

describe("GET /api/countries", () => {
  it("returns active countries and available list", async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.active).toHaveLength(1);
    expect(data.available).toBeDefined();
    expect(data.available.length).toBeGreaterThan(0);
  });
});

describe("POST /api/countries", () => {
  it("adds a known country", async () => {
    const res = await POST(createRequest("POST", { fiat: "KES" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.fiat).toBe("KES");
  });

  it("rejects unknown fiat code", async () => {
    const res = await POST(createRequest("POST", { fiat: "XYZ" }));
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/countries", () => {
  it("toggles country active status", async () => {
    const res = await PUT(createRequest("PUT", { fiat: "RWF", isActive: false }));
    const data = await res.json();
    expect(data.isActive).toBe(false);
  });

  it("returns 400 when fiat is missing", async () => {
    const res = await PUT(createRequest("PUT", {}));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/countries", () => {
  it("removes a country", async () => {
    const res = await DELETE(createRequest("DELETE", { fiat: "RWF" }));
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("returns 400 when fiat is missing", async () => {
    const res = await DELETE(createRequest("DELETE", {}));
    expect(res.status).toBe(400);
  });
});
