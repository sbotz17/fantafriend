import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { leagues } from "./leagues";
import { players } from "./players";
import { users } from "./users";

/**
 * Chiamata attualmente in corso in una lega: chi è stato chiamato e a quanto.
 *
 * Serve da ponte fra l'estensione del browser (che legge la pagina d'asta in
 * una scheda) e la Sala d'asta (aperta in un'altra scheda o su un altro
 * dispositivo): l'estensione scrive qui, la dashboard legge e si autocompila.
 *
 * È uno stato volatile, non uno storico: una sola riga per lega, sovrascritta
 * a ogni nuova chiamata. Lo storico delle offerte vive in `bids`, quello degli
 * acquisti in `roster_entries`.
 */
export const auctionLiveState = pgTable("auction_live_state", {
  leagueId: uuid("league_id")
    .primaryKey()
    .references(() => leagues.id, { onDelete: "cascade" }),
  /** Nome così come letto dalla pagina d'asta, prima del riconoscimento. */
  playerName: text("player_name").notNull(),
  currentBid: integer("current_bid"),
  /** Giocatore del listone riconosciuto, se il match è riuscito. */
  matchedPlayerId: uuid("matched_player_id").references(() => players.id, {
    onDelete: "set null",
  }),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
