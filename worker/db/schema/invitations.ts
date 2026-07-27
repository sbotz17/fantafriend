import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { organizationRole, organizations } from "./organizations";
import { users } from "./users";

export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
]);

/**
 * Inviti a un'organizzazione. Funzionano senza email: chi invita ottiene un
 * token (link condivisibile) di cui in DB è salvato solo l'hash SHA-256.
 * L'invitato, autenticato, accetta il token e diventa membro con `role`.
 */
export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Email suggerita del destinatario (facoltativa, solo indicativa).
    email: text("email"),
    role: organizationRole("role").notNull().default("member"),
    tokenHash: text("token_hash").notNull().unique(),
    status: invitationStatus("status").notNull().default("pending"),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("organization_invitations_org_idx").on(table.organizationId),
  ],
);
