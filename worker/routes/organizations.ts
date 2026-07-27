import { zValidator } from "@hono/zod-validator";
import { eq, getTableColumns } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { createRouter, requireDb, requireUser } from "../lib/app";
import {
  ADMIN_ROLES,
  requireOrgMember,
  requireOrgRole,
} from "../lib/authz";
import { idParam, slug } from "../lib/validation";
import { organizationMembers, organizations } from "../db/schema";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug,
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    slug: slug.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nessun campo da aggiornare",
  });

export const organizationsRoutes = createRouter();

// GET /api/organizations — solo le organizzazioni di cui l'utente è membro.
organizationsRoutes.get("/", async (c) => {
  const db = requireDb(c);
  const user = requireUser(c);

  const rows = await db
    .select(getTableColumns(organizations))
    .from(organizations)
    .innerJoin(
      organizationMembers,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, user.id));

  return c.json(rows);
});

// POST /api/organizations — il creatore ne diventa proprietario e membro owner.
organizationsRoutes.post("/", zValidator("json", createSchema), async (c) => {
  const db = requireDb(c);
  const user = requireUser(c);
  const body = c.req.valid("json");

  const [organization] = await db
    .insert(organizations)
    .values({ ...body, ownerId: user.id })
    .returning();

  await db.insert(organizationMembers).values({
    organizationId: organization.id,
    userId: user.id,
    role: "owner",
  });

  return c.json(organization, 201);
});

// GET /api/organizations/:id
organizationsRoutes.get("/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const user = requireUser(c);
  const { id } = c.req.valid("param");

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id));
  if (!organization) {
    throw new HTTPException(404, { message: "Organizzazione non trovata" });
  }
  await requireOrgMember(db, id, user.id);

  return c.json(organization);
});

// PATCH /api/organizations/:id — solo owner/admin.
organizationsRoutes.patch(
  "/:id",
  zValidator("param", idParam),
  zValidator("json", updateSchema),
  async (c) => {
    const db = requireDb(c);
    const user = requireUser(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    await requireOrgRole(db, id, user.id, ADMIN_ROLES);

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

// DELETE /api/organizations/:id — solo owner.
organizationsRoutes.delete("/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const user = requireUser(c);
  const { id } = c.req.valid("param");

  await requireOrgRole(db, id, user.id, ["owner"]);

  await db.delete(organizations).where(eq(organizations.id, id));
  return c.body(null, 204);
});

// GET /api/organizations/:id/members
organizationsRoutes.get(
  "/:id/members",
  zValidator("param", idParam),
  async (c) => {
    const db = requireDb(c);
    const user = requireUser(c);
    const { id } = c.req.valid("param");

    await requireOrgMember(db, id, user.id);

    const rows = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, id));

    return c.json(rows);
  },
);
