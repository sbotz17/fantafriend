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

/**
 * Ruoli classici del fantacalcio:
 * P = Portiere, D = Difensore, C = Centrocampista, A = Attaccante.
 */
export const playerRole = pgEnum("player_role", ["P", "D", "C", "A"]);

/**
 * Catalogo dei giocatori reali di Serie A (il "listone").
 * È condiviso e versionato per stagione: la stessa persona può comparire
 * in stagioni diverse con quotazioni differenti.
 */
export const players = pgTable(
  "players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    realTeam: text("real_team").notNull(),
    role: playerRole("role").notNull(),
    baseQuotation: integer("base_quotation").notNull().default(1),
    season: text("season").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("players_name_team_season_unique").on(
      table.name,
      table.realTeam,
      table.season,
    ),
    index("players_season_role_idx").on(table.season, table.role),
  ],
);
