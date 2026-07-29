import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { createRouter, requireDb, requireUser } from "../lib/app";
import { ADMIN_ROLES, requireOrgRole } from "../lib/authz";
import { generateToken, hashToken } from "../lib/tokens";
import { idParam } from "../lib/validation";
import {
  organizationInvitations,
  organizationMembers,
  organizations,
} from "../db/schema";

// Durata dell'invito: 14 giorni.
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const orgParam = z.object({ id: z.uuid() });
const tokenParam = z.object({ token: z.string().min(16).max(128) });

const createSchema = z.object({
  email: z.email().max(254).optional(),
  // Non è possibile invitare come "owner".
  role: z.enum(["admin", "member"]).default("member"),
});

const acceptSchema = z.object({ token: z.string().min(16).max(128) });

// Campi pubblici dell'invito (mai il tokenHash).
const invitationColumns = {
  id: organizationInvitations.id,
  organizationId: organizationInvitations.organizationId,
  email: organizationInvitations.email,
  role: organizationInvitations.role,
  status: organizationInvitations.status,
  expiresAt: organizationInvitations.expiresAt,
  createdAt: organizationInvitations.createdAt,
};

export const invitationsRoutes = createRouter();

// POST /api/organizations/:id/invitations — crea un invito (owner/admin).
invitationsRoutes.post(
  "/organizations/:id/invitations",
  zValidator("param", orgParam),
  zValidator("json", createSchema),
  async (c) => {
    const db = requireDb(c);
    const user = requireUser(c);
    const { id: organizationId } = c.req.valid("param");
    const { email, role } = c.req.valid("json");

    await requireOrgRole(db, organizationId, user.id, ADMIN_ROLES);

    const token = generateToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const [invitation] = await db
      .insert(organizationInvitations)
      .values({
        organizationId,
        email: email ?? null,
        role,
        tokenHash,
        invitedByUserId: user.id,
        expiresAt,
      })
      .returning(invitationColumns);

    // Il token in chiaro è restituito solo qui: servirà per il link d'invito.
    return c.json({ ...invitation, token }, 201);
  },
);

// GET /api/organizations/:id/invitations — inviti in sospeso (owner/admin).
invitationsRoutes.get(
  "/organizations/:id/invitations",
  zValidator("param", orgParam),
  async (c) => {
    const db = requireDb(c);
    const user = requireUser(c);
    const { id: organizationId } = c.req.valid("param");

    await requireOrgRole(db, organizationId, user.id, ADMIN_ROLES);

    const rows = await db
      .select(invitationColumns)
      .from(organizationInvitations)
      .where(eq(organizationInvitations.organizationId, organizationId));

    return c.json(rows.filter((r) => r.status === "pending"));
  },
);

// DELETE /api/invitations/:id — revoca un invito (owner/admin dell'org).
invitationsRoutes.delete(
  "/invitations/:id",
  zValidator("param", idParam),
  async (c) => {
    const db = requireDb(c);
    const user = requireUser(c);
    const { id } = c.req.valid("param");

    const [invitation] = await db
      .select({ organizationId: organizationInvitations.organizationId })
      .from(organizationInvitations)
      .where(eq(organizationInvitations.id, id));
    if (!invitation) {
      throw new HTTPException(404, { message: "Invito non trovato" });
    }
    await requireOrgRole(db, invitation.organizationId, user.id, ADMIN_ROLES);

    await db
      .update(organizationInvitations)
      .set({ status: "revoked" })
      .where(eq(organizationInvitations.id, id));

    return c.body(null, 204);
  },
);

// GET /api/invitations/:token — anteprima dell'invito (per la pagina di accettazione).
invitationsRoutes.get(
  "/invitations/token/:token",
  zValidator("param", tokenParam),
  async (c) => {
    const db = requireDb(c);
    requireUser(c);
    const { token } = c.req.valid("param");

    const tokenHash = await hashToken(token);
    const [row] = await db
      .select({
        organizationId: organizationInvitations.organizationId,
        organizationName: organizations.name,
        role: organizationInvitations.role,
        email: organizationInvitations.email,
        status: organizationInvitations.status,
        expiresAt: organizationInvitations.expiresAt,
      })
      .from(organizationInvitations)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationInvitations.organizationId),
      )
      .where(eq(organizationInvitations.tokenHash, tokenHash));

    if (!row) {
      throw new HTTPException(404, { message: "Invito non trovato" });
    }

    const valid = row.status === "pending" && row.expiresAt > new Date();
    return c.json({ ...row, valid });
  },
);

// POST /api/invitations/accept — l'utente autenticato accetta un invito.
invitationsRoutes.post(
  "/invitations/accept",
  zValidator("json", acceptSchema),
  async (c) => {
    const db = requireDb(c);
    const user = requireUser(c);
    const { token } = c.req.valid("json");

    const tokenHash = await hashToken(token);
    const [invitation] = await db
      .select()
      .from(organizationInvitations)
      .where(eq(organizationInvitations.tokenHash, tokenHash));

    if (
      !invitation ||
      invitation.status !== "pending" ||
      invitation.expiresAt <= new Date()
    ) {
      throw new HTTPException(400, {
        message: "Invito non valido o scaduto",
      });
    }

    await db
      .insert(organizationMembers)
      .values({
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
      })
      .onConflictDoNothing();

    await db
      .update(organizationInvitations)
      .set({
        status: "accepted",
        acceptedByUserId: user.id,
        acceptedAt: new Date(),
      })
      .where(eq(organizationInvitations.id, invitation.id));

    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, invitation.organizationId));

    return c.json(organization);
  },
);
