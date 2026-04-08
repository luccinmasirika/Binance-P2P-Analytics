import pg from "pg";

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(
    "TRUNCATE ad_payment_methods, market_depth_snapshots, ads, advertisers, scrape_sessions, forex_rates, alert_configs, countries CASCADE"
  );
  console.log("All tables truncated");
  await client.end();
}

main();
