import { NextResponse } from "next/server";
import { runFullScrape } from "@/lib/scraper/runner";

export async function POST() {
  try {
    await runFullScrape();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Manual scrape failed:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
