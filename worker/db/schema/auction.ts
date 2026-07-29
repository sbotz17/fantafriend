import {
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { leagues } from "./leagues";
import { players } from "./players";
import { fantasyTeams } from "./teams";

/**
 * Rosa: un giocatore assegnato a una squadra al prezzo di acquisto.
 *
 * È la fonte di verità per la gestione del budget: il budget speso da
 * una squadra è la somma dei `price` delle sue roster_entries.
 * Il vincolo di unicità (league_id, player_id) garantisce che, all'interno
 * di una lega, ogni giocatore reale possa appartenere a una sola squadra.
 */
export const rosterEntries = pgTable(
  "roster_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    fantasyTeamId: uuid("fantasy_team_id")
      .notNull()
      .references(() => fantasyTeams.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "restrict" }),
    price: integer("price").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Un giocatore può essere posseduto da una sola squadra nella lega.
    unique("roster_entries_league_player_unique").on(
      table.leagueId,
      table.playerId,
    ),
    index("roster_entries_team_idx").on(table.fantasyTeamId),
    index("roster_entries_league_idx").on(table.leagueId),
  ],
);

/**
 * Storico delle offerte effettuate durante l'asta.
 *
 * Non incide sul budget (solo l'aggiudicazione in roster_entries lo fa),
 * ma tiene traccia dell'andamento dell'asta per ogni giocatore.
 */
export const bids = pgTable(
  "bids",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    fantasyTeamId: uuid("fantasy_team_id")
      .notNull()
      .references(() => fantasyTeams.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bids_league_player_idx").on(table.leagueId, table.playerId),
    index("bids_team_idx").on(table.fantasyTeamId),
  ],
);
