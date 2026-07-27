import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { createRouter, requireDb } from "../lib/app";
import { idParam, slug } from "../lib/validation";
import { organizationMembers, organizations } from "../db/schema";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug,
  ownerId: z.uuid(),
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    slug: slug.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nessun campo da aggiornare",
  });

const listQuery = z.object({ ownerId: z.uuid().optional() });

export const organizationsRoutes = createRouter();

// GET /api/organizations
organizationsRoutes.get("/", zValidator("query", listQuery), async (c) => {
  const db = requireDb(c);
  const { ownerId } = c.req.valid("query");

  const rows = await db
    .select()
    .from(organizations)
    .where(ownerId ? eq(organizations.ownerId, ownerId) : undefined);

  return c.json(rows);
});

// POST /api/organizations
organizationsRoutes.post("/", zValidator("json", createSchema), async (c) => {
  const db = requireDb(c);
  const body = c.req.valid("json");

  const [organization] = await db
    .insert(organizations)
    .values(body)
    .returning();

  // Il proprietario diventa automaticamente membro con ruolo "owner".
  await db.insert(organizationMembers).values({
    organizationId: organization.id,
    userId: body.ownerId,
    role: "owner",
  });

  return c.json(organization, 201);
});

// GET /api/organizations/:id
organizationsRoutes.get("/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const { id } = c.req.valid("param");

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id));

  if (!organization) {
    throw new HTTPException(404, { message: "Organizzazione non trovata" });
  }
  return c.json(organization);
});

// PATCH /api/organizations/:id
organizationsRoutes.patch(
  "/:id",
  zValidator("param", idParam),
  zValidator("json", updateSchema),
  async (c) => {
    const db = requireDb(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const [organization] = await db
      .update(organizations)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();

    if (!organization) {
      throw new HTTPException(404, { message: "Organizzazione non trovata" });
    }
    return c.json(organization);
  },
);

// DELETE /api/organizations/:id
organizationsRoutes.delete("/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const { id } = c.req.valid("param");

  const deleted = await db
    .delete(organizations)
    .where(eq(organizations.id, id))
    .returning({ id: organizations.id });

  if (deleted.length === 0) {
    throw new HTTPException(404, { message: "Organizzazione non trovata" });
  }
  return c.body(null, 204);
});

// GET /api/organizations/:id/members
organizationsRoutes.get(
  "/:id/members",
  zValidator("param", idParam),
  async (c) => {
    const db = requireDb(c);
    const { id } = c.req.valid("param");

    const rows = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, id));

    return c.json(rows);
  },
);
