import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../lib/db/client";

async function main() {
  const sqlPath = join(process.cwd(), "sql/matviews/001_create.sql");
  const ddl = readFileSync(sqlPath, "utf8");

  console.log(`[${new Date().toISOString()}] Applying ${sqlPath}...`);
  const start = Date.now();
  await db.execute(sql.raw(ddl));
  console.log(`Done in ${Date.now() - start}ms`);
  process.exit(0);
}

main().catch((err) => {
  console.error("init-matviews failed:", err);
  process.exit(1);
});
