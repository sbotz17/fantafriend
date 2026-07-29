import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { createRouter, requireDb, requireUser } from "../lib/app";
import {
  clearSessionCookie,
  createSession,
  destroySession,
  getSessionToken,
  setSessionCookie,
} from "../lib/auth";
import { hashPassword, verifyPassword } from "../lib/password";
import { users } from "../db/schema";

const signupSchema = z.object({
  email: z.email().max(254),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
});

// Colonne pubbliche dell'utente (mai `passwordHash`).
const publicUserColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  emailVerified: users.emailVerified,
  createdAt: users.createdAt,
};

export const authRoutes = createRouter();

// POST /api/auth/signup
authRoutes.post("/signup", zValidator("json", signupSchema), async (c) => {
  const db = requireDb(c);
  const { email, name, password } = c.req.valid("json");

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({ email: email.toLowerCase(), name, passwordHash })
    .returning(publicUserColumns);

  const { token, expiresAt } = await createSession(db, user.id);
  setSessionCookie(c, token, expiresAt);

  return c.json(user, 201);
});

// POST /api/auth/login
authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const db = requireDb(c);
  const { email, password } = c.req.valid("json");

  const [account] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));

  // Messaggio identico per email inesistente e password errata: evita di
  // rivelare quali email sono registrate.
  const invalid = new HTTPException(401, { message: "Credenziali non valide" });
  if (!account) {
    // Verifica comunque una password fittizia per uniformare i tempi.
    await verifyPassword(password, "pbkdf2$100000$AAAA$AAAA");
    throw invalid;
  }

  const ok = await verifyPassword(password, account.passwordHash);
  if (!ok) {
    throw invalid;
  }

  const { token, expiresAt } = await createSession(db, account.id);
  setSessionCookie(c, token, expiresAt);

  return c.json({
    id: account.id,
    email: account.email,
    name: account.name,
    emailVerified: account.emailVerified,
    createdAt: account.createdAt,
  });
});

// POST /api/auth/logout
authRoutes.post("/logout", async (c) => {
  const db = requireDb(c);
  const token = getSessionToken(c);
  if (token) {
    await destroySession(db, token);
  }
  clearSessionCookie(c);
  return c.body(null, 204);
});

// GET /api/auth/me — utente attualmente autenticato.
authRoutes.get("/me", (c) => {
  const user = requireUser(c);
  return c.json(user);
});
