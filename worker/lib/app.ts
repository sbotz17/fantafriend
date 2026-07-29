import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { Context } from "hono";

import { createDatabase } from "../db/client";
import type { Database } from "../db/client";

/** Utente autenticato ricavato dalla sessione (senza dati sensibili). */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

/**
 * Tipi condivisi dell'applicazione Hono.
 * - Bindings: variabili/secret disponibili su `c.env` (es. DATABASE_URL).
 * - Variables: valori impostati dai middleware su `c.set()` (es. `db`, `user`).
 */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    db?: Database;
    user?: SessionUser;
  };
};

/** Factory per un router tipizzato coerente in tutta l'app. */
export function createRouter() {
  return new Hono<AppEnv>();
}

/**
 * Middleware che istanzia il client Drizzle a partire da DATABASE_URL e lo
 * rende disponibile su `c.get("db")`. Se la variabile manca non solleva subito
 * un errore (così endpoint come /api/health restano raggiungibili): sarà
 * `requireDb` a segnalarlo quando un handler tenta di usare il database.
 */
export const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const url = c.env.DATABASE_URL;
  if (url) {
    c.set("db", createDatabase(url));
  }
  await next();
});

/**
 * Recupera l'istanza del database dal contesto, sollevando un 500 leggibile
 * se il middleware non l'ha impostata (tipicamente DATABASE_URL mancante).
 */
export function requireDb(c: Context<AppEnv>): Database {
  const db = c.get("db");
  if (!db) {
    throw new HTTPException(500, {
      message: "DATABASE_URL non configurata sul Worker",
    });
  }
  return db;
}

/**
 * Recupera l'utente autenticato dal contesto, sollevando un 401 se la richiesta
 * non è autenticata.
 */
export function requireUser(c: Context<AppEnv>): SessionUser {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Autenticazione richiesta" });
  }
  return user;
}

/** Estrae il codice errore SQLSTATE da un errore Postgres, se presente. */
function postgresErrorCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Registra la gestione centralizzata di errori e rotte non trovate, così ogni
 * risposta di errore è un JSON coerente `{ error: string }`.
 */
export function registerErrorHandling(app: Hono<AppEnv>) {
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }

    const code = postgresErrorCode(err);
    if (code === "23505") {
      return c.json(
        { error: "Risorsa già esistente (vincolo di unicità violato)" },
        409,
      );
    }
    if (code === "23503") {
      return c.json(
        { error: "Riferimento non valido: la risorsa collegata non esiste" },
        409,
      );
    }

    console.error("Errore non gestito:", err);
    return c.json({ error: "Errore interno del server" }, 500);
  });

  app.notFound((c) => {
    if (c.req.path.startsWith("/api/")) {
      return c.json({ error: "Endpoint non trovato" }, 404);
    }
    // Rotte non-API: delega agli asset statici, che con il fallback
    // single-page-application restituiscono index.html (deep-link/refresh).
    return c.env.ASSETS.fetch(c.req.raw);
  });
}
