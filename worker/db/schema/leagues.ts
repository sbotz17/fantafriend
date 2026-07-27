import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

/**
 * Ciclo di vita di una lega:
 * - setup:     configurazione (squadre, regole, budget) in corso;
 * - auction:   asta aperta, si assegnano i giocatori;
 * - completed: rose complete, asta chiusa.
 */
export const leagueStatus = pgEnum("league_status", [
  "setup",
  "auction",
  "completed",
]);

/**
 * Una lega di fantacalcio appartenente a un'organizzazione.
 * Contiene la configurazione dell'asta: budget iniziale per squadra
 * e numero di slot per ruolo che compongono la rosa.
 */
export const leagues = pgTable(
  "leagues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    season: text("season").notNull(),
    status: leagueStatus("status").notNull().default("setup"),
    // Crediti iniziali a disposizione di ogni squadra.
    budget: integer("budget").notNull().default(500),
    // Composizione della rosa: numero di giocatori per ruolo.
    slotsGoalkeeper: integer("slots_goalkeeper").notNull().default(3),
    slotsDefender: integer("slots_defender").notNull().default(8),
    slotsMidfielder: integer("slots_midfielder").notNull().default(8),
    slotsForward: integer("slots_forward").notNull().default(6),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Lo slug è univoco all'interno della singola organizzazione.
    unique("leagues_organization_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
    index("leagues_organization_idx").on(table.organizationId),
  ],
);
