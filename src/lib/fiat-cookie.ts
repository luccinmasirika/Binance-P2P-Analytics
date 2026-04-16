import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { countries } from "./db/schema";

export const FIAT_COOKIE = "p2p_fiat";
export const FIAT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const DEFAULT_FIAT = "RWF";

export async function getActiveFiat(): Promise<string> {
  const store = await cookies();
  const cookieValue = store.get(FIAT_COOKIE)?.value;

  if (cookieValue) {
    const [row] = await db
      .select({ fiat: countries.fiat })
      .from(countries)
      .where(eq(countries.fiat, cookieValue))
      .limit(1);
    if (row && row.fiat) return row.fiat;
  }

  const [firstActive] = await db
    .select({ fiat: countries.fiat })
    .from(countries)
    .where(eq(countries.isActive, true))
    .orderBy(countries.name)
    .limit(1);

  return firstActive?.fiat ?? DEFAULT_FIAT;
}

export async function setActiveFiatCookie(fiat: string): Promise<void> {
  const store = await cookies();
  store.set(FIAT_COOKIE, fiat, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: FIAT_COOKIE_MAX_AGE,
  });
}
