import { zValidator } from "@hono/zod-validator";
import { and, eq, ilike } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { createRouter, requireDb } from "../lib/app";
import { idParam, positiveInt, season } from "../lib/validation";
import { players } from "../db/schema";

const roleEnum = z.enum(["P", "D", "C", "A"]);

const statsShape = {
  fvm: z.number().int().min(0).optional(),
  fantamedia: z.number().min(0).max(30).optional(),
  presences: z.number().int().min(0).optional(),
};

const playerShape = {
  name: z.string().min(1).max(120),
  realTeam: z.string().min(1).max(80),
  role: roleEnum,
  baseQuotation: positiveInt.optional(),
  season,
  ...statsShape,
};

const createSchema = z.object(playerShape);

// Import "listone": array di giocatori. Le righe già presenti (stesso
// nome+squadra+stagione) vengono ignorate senza errore.
const bulkSchema = z.object({
  players: z.array(z.object(playerShape)).min(1).max(2000),
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    realTeam: z.string().min(1).max(80).optional(),
    role: roleEnum.optional(),
    baseQuotation: positiveInt.optional(),
    season: season.optional(),
    ...statsShape,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nessun campo da aggiornare",
  });

const listQuery = z.object({
  season: season.optional(),
  role: roleEnum.optional(),
  search: z.string().min(1).max(120).optional(),
});

export const playersRoutes = createRouter();

// GET /api/players
playersRoutes.get("/", zValidator("query", listQuery), async (c) => {
  const db = requireDb(c);
  const q = c.req.valid("query");

  const filters = [
    q.season ? eq(players.season, q.season) : undefined,
    q.role ? eq(players.role, q.role) : undefined,
    q.search ? ilike(players.name, `%${q.search}%`) : undefined,
  ].filter((f) => f !== undefined);

  const rows = await db
    .select()
    .from(players)
    .where(filters.length > 0 ? and(...filters) : undefined);

  return c.json(rows);
});

// POST /api/players
playersRoutes.post("/", zValidator("json", createSchema), async (c) => {
  const db = requireDb(c);
  const body = c.req.valid("json");

  const [player] = await db.insert(players).values(body).returning();
  return c.json(player, 201);
});

// POST /api/players/bulk
playersRoutes.post("/bulk", zValidator("json", bulkSchema), async (c) => {
  const db = requireDb(c);
  const { players: rows } = c.req.valid("json");

  const inserted = await db
    .insert(players)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: players.id });

  return c.json(
    { requested: rows.length, inserted: inserted.length },
    201,
  );
});

// GET /api/players/:id
playersRoutes.get("/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const { id } = c.req.valid("param");

  const [player] = await db.select().from(players).where(eq(players.id, id));
  if (!player) {
    throw new HTTPException(404, { message: "Giocatore non trovato" });
  }
  return c.json(player);
});

// PATCH /api/players/:id
playersRoutes.patch(
  "/:id",
  zValidator("param", idParam),
  zValidator("json", updateSchema),
  async (c) => {
    const db = requireDb(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const [player] = await db
      .update(players)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(players.id, id))
      .returning();

    if (!player) {
      throw new HTTPException(404, { message: "Giocatore non trovato" });
    }
    return c.json(player);
  },
);

// DELETE /api/players/:id
playersRoutes.delete("/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const { id } = c.req.valid("param");

  const deleted = await db
    .delete(players)
    .where(eq(players.id, id))
    .returning({ id: players.id });

  if (deleted.length === 0) {
    throw new HTTPException(404, { message: "Giocatore non trovato" });
  }
  return c.body(null, 204);
});
