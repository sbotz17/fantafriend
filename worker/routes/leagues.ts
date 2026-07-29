import { zValidator } from "@hono/zod-validator";
import { eq, getTableColumns } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { createRouter, requireDb, requireUser } from "../lib/app";
import {
  ADMIN_ROLES,
  requireLeagueMember,
  requireOrgMember,
} from "../lib/authz";
import {
  idParam,
  nonNegativeInt,
  positiveInt,
  season,
  slug,
} from "../lib/validation";
import { leagues, organizationMembers } from "../db/schema";

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

// GET /api/leagues — leghe delle organizzazioni di cui l'utente è membro.
leaguesRoutes.get("/", zValidator("query", listQuery), async (c) => {
  const db = requireDb(c);
  const user = requireUser(c);
  const { organizationId } = c.req.valid("query");

  if (organizationId) {
    await requireOrgMember(db, organizationId, user.id);
    const rows = await db
      .select()
      .from(leagues)
      .where(eq(leagues.organizationId, organizationId));
    return c.json(rows);
  }

  // Senza filtro: tutte le leghe delle organizzazioni dell'utente.
  const rows = await db
    .select(getTableColumns(leagues))
    .from(leagues)
    .innerJoin(
      organizationMembers,
      eq(organizationMembers.organizationId, leagues.organizationId),
    )
    .where(eq(organizationMembers.userId, user.id));
  return c.json(rows);
});

// POST /api/leagues — richiede l'appartenenza all'organizzazione.
leaguesRoutes.post("/", zValidator("json", createSchema), async (c) => {
  const db = requireDb(c);
  const user = requireUser(c);
  const body = c.req.valid("json");

  await requireOrgMember(db, body.organizationId, user.id);

  const [league] = await db.insert(leagues).values(body).returning();
  return c.json(league, 201);
});

// GET /api/leagues/:id
leaguesRoutes.get("/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const user = requireUser(c);
  const { id } = c.req.valid("param");

  const { league } = await requireLeagueMember(db, id, user.id);
  return c.json(league);
});

// PATCH /api/leagues/:id — solo owner/admin dell'organizzazione.
leaguesRoutes.patch(
  "/:id",
  zValidator("param", idParam),
  zValidator("json", updateSchema),
  async (c) => {
    const db = requireDb(c);
    const user = requireUser(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const { role } = await requireLeagueMember(db, id, user.id);
    if (!ADMIN_ROLES.includes(role)) {
      throw new HTTPException(403, {
        message: "Permessi insufficienti per modificare la lega",
      });
    }

    const [updated] = await db
      .update(leagues)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(leagues.id, id))
      .returning();

    return c.json(updated);
  },
);

// DELETE /api/leagues/:id — solo owner/admin dell'organizzazione.
leaguesRoutes.delete("/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const user = requireUser(c);
  const { id } = c.req.valid("param");

  const { role } = await requireLeagueMember(db, id, user.id);
  if (!ADMIN_ROLES.includes(role)) {
    throw new HTTPException(403, {
      message: "Permessi insufficienti per eliminare la lega",
    });
  }

  await db.delete(leagues).where(eq(leagues.id, id));
  return c.body(null, 204);
});
