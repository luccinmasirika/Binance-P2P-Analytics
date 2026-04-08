import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return drizzle(url, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_, prop) {
    if (!_db) _db = createDb();
    return (_db as any)[prop];
  },
});
