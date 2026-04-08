import { runFullScrape } from "../lib/scraper/runner";

async function main() {
  try {
    await runFullScrape();
    process.exit(0);
  } catch (err) {
    console.error("Scrape failed:", err);
    process.exit(1);
  }
}

main();
