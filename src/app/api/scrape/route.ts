import { NextResponse, after, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runFullScrape } from "@/lib/scraper/runner";
import { SESSION_COOKIE, SESSION_VALUE } from "@/lib/auth";

export const maxDuration = 300;

function safeCompare(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function isAuthorized(req: NextRequest) {
  if (req.cookies.get(SESSION_COOKIE)?.value === SESSION_VALUE) return true;

  const secret = process.env.SCRAPE_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  return safeCompare(header.slice(prefix.length), secret);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      await runFullScrape();
    } catch (err) {
      console.error("Background scrape failed:", err);
    }
  });

  return NextResponse.json({ accepted: true }, { status: 202 });
}
