import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchForexRate } from "@/lib/scraper/forex";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchForexRate", () => {
  it("fetches and returns forex rate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: { RWF: 1350.5 } }),
      })
    );

    const result = await fetchForexRate();
    expect(result).toEqual({
      base: "USD",
      target: "RWF",
      rate: 1350.5,
      source: "exchangerate-api",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://open.er-api.com/v6/latest/USD",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("fetches rate for custom fiat", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: { KES: 129.5 } }),
      })
    );

    const result = await fetchForexRate("KES");
    expect(result.target).toBe("KES");
    expect(result.rate).toBe(129.5);
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );

    await expect(fetchForexRate()).rejects.toThrow("ExchangeRate API error: 500");
  });

  it("throws when fiat rate is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: {} }),
      })
    );

    await expect(fetchForexRate()).rejects.toThrow(
      "Invalid forex rate response: RWF rate not found"
    );
  });

  it("throws when rates is undefined", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );

    await expect(fetchForexRate()).rejects.toThrow(
      "Invalid forex rate response: RWF rate not found"
    );
  });

  it("throws when rate is string instead of number", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rates: { RWF: "1350" } }),
      })
    );

    await expect(fetchForexRate()).rejects.toThrow(
      "Invalid forex rate response: RWF rate not found"
    );
  });
});
