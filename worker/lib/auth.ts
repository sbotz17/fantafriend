import { and, eq, gt } from "drizzle-orm";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

import type { Context } from "hono";

import type { AppEnv, SessionUser } from "./app";
import { generateToken, hashToken } from "./tokens";
import type { Database } from "../db/client";
import { sessions, users } from "../db/schema";

export const SESSION_COOKIE = "ff_session";

// Durata della sessione: 30 giorni.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Crea una sessione per l'utente e restituisce il token in chiaro (da inviare
 * nel cookie) e la data di scadenza.
 */
export async function createSession(
  db: Database,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({ userId, tokenHash, expiresAt });

  return { token, expiresAt };
}

/** Risolve un token di sessione nell'utente, se la sessione è valida. */
async function resolveSession(
  db: Database,
  token: string,
): Promise<SessionUser | null> {
  const tokenHash = await hashToken(token);

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())),
    );

  return row ?? null;
}

/** Elimina la sessione associata al token (usato dal logout). */
export async function destroySession(
  db: Database,
  token: string,
): Promise<void> {
  const tokenHash = await hashToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

function isSecureRequest(c: Context<AppEnv>): boolean {
  return new URL(c.req.url).protocol === "https:";
}

/** Imposta il cookie di sessione HttpOnly. */
export function setSessionCookie(
  c: Context<AppEnv>,
  token: string,
  expiresAt: Date,
): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(c),
    sameSite: "Lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Rimuove il cookie di sessione. */
export function clearSessionCookie(c: Context<AppEnv>): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

/** Legge il token di sessione dal cookie della richiesta. */
export function getSessionToken(c: Context<AppEnv>): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

/**
 * Middleware "soft": se esiste una sessione valida imposta `c.set("user")`,
 * altrimenti prosegue senza autenticazione (sarà la guardia o `requireUser` a
 * bloccare le rotte protette).
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const token = getSessionToken(c);
  const db = c.get("db");
  if (token && db) {
    const user = await resolveSession(db, token);
    if (user) {
      c.set("user", user);
    }
  }
  await next();
});
