import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { createRouter, requireDb } from "../lib/app";
import { idParam, nonNegativeInt, positiveInt, season, slug } from "../lib/validation";
import { leagues } from "../db/schema";

const statusEnum = z.enum(["setup", "auction", "completed"]);

const slotsShape = {
  slotsGoalkeeper: nonNegativeInt.optional(),
  slotsDefender: nonNegativeInt.optional(),
  slotsMidfielder: nonNegativeInt.optional(),
  slotsForward: nonNegativeInt.optional(),
};

const createSchema = z.object({
  organizationId: z.uuid(),
  name: z.string().min(1).max(120),
  slug,
  season,
  budget: positiveInt.optional(),
  status: statusEnum.optional(),
  ...slotsShape,
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    slug: slug.optional(),
    season: season.optional(),
    budget: positiveInt.optional(),
    status: statusEnum.optional(),
    ...slotsShape,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nessun campo da aggiornare",
  });

const listQuery = z.object({ organizationId: z.uuid().optional() });

export const leaguesRoutes = createRouter();

// GET /api/leagues
leaguesRoutes.get("/", zValidator("query", listQuery), async (c) => {
  const db = requireDb(c);
  const { organizationId } = c.req.valid("query");

  const rows = await db
    .select()
    .from(leagues)
    .where(
      organizationId ? eq(leagues.organizationId, organizationId) : undefined,
    );

  return c.json(rows);
});

// POST /api/leagues
leaguesRoutes.post("/", zValidator("json", createSchema), async (c) => {
  const db = requireDb(c);
  const body = c.req.valid("json");

  const [league] = await db.insert(leagues).values(body).returning();
  return c.json(league, 201);
});

// GET /api/leagues/:id
leaguesRoutes.get("/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const { id } = c.req.valid("param");

  const [league] = await db.select().from(leagues).where(eq(leagues.id, id));
  if (!league) {
    throw new HTTPException(404, { message: "Lega non trovata" });
  }
  return c.json(league);
});

// PATCH /api/leagues/:id
leaguesRoutes.patch(
  "/:id",
  zValidator("param", idParam),
  zValidator("json", updateSchema),
  async (c) => {
    const db = requireDb(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const [league] = await db
      .update(leagues)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(leagues.id, id))
      .returning();

    if (!league) {
      throw new HTTPException(404, { message: "Lega non trovata" });
    }
    return c.json(league);
  },
);

// DELETE /api/leagues/:id
leaguesRoutes.delete("/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const { id } = c.req.valid("param");

  const deleted = await db
    .delete(leagues)
    .where(eq(leagues.id, id))
    .returning({ id: leagues.id });

  if (deleted.length === 0) {
    throw new HTTPException(404, { message: "Lega non trovata" });
  }
  return c.body(null, 204);
});
