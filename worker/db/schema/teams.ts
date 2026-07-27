import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { leagues } from "./leagues";
import { users } from "./users";

/**
 * Una squadra partecipante a una lega (il "fantallenatore").
 *
 * L'owner è opzionale: una squadra può essere gestita da un utente
 * registrato oppure essere un semplice partecipante senza account,
 * utile quando l'asta viene condotta da un'unica persona al tavolo.
 *
 * Il budget residuo non è memorizzato qui: viene derivato sottraendo
 * la somma dei prezzi d'acquisto (roster_entries) dal budget della lega,
 * così da evitare disallineamenti.
 */
export const fantasyTeams = pgTable(
  "fantasy_teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Nomi squadra univoci all'interno della stessa lega.
    unique("fantasy_teams_league_name_unique").on(table.leagueId, table.name),
    index("fantasy_teams_league_idx").on(table.leagueId),
    index("fantasy_teams_owner_idx").on(table.ownerUserId),
  ],
);
