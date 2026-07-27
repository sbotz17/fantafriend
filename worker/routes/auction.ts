import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { createRouter, requireDb } from "../lib/app";
import { idParam, positiveInt } from "../lib/validation";
import {
  bids,
  fantasyTeams,
  leagues,
  players,
  rosterEntries,
} from "../db/schema";

const leagueParam = z.object({ leagueId: z.uuid() });

const assignSchema = z.object({
  fantasyTeamId: z.uuid(),
  playerId: z.uuid(),
  price: positiveInt,
});

const bidSchema = z.object({
  fantasyTeamId: z.uuid(),
  playerId: z.uuid(),
  amount: positiveInt,
});

const bidQuery = z.object({ playerId: z.uuid().optional() });

type PlayerRole = "P" | "D" | "C" | "A";

/** Numero di slot disponibili per ruolo secondo la configurazione della lega. */
function slotsForRole(
  league: {
    slotsGoalkeeper: number;
    slotsDefender: number;
    slotsMidfielder: number;
    slotsForward: number;
  },
  role: PlayerRole,
): number {
  switch (role) {
    case "P":
      return league.slotsGoalkeeper;
    case "D":
      return league.slotsDefender;
    case "C":
      return league.slotsMidfielder;
    case "A":
      return league.slotsForward;
  }
}

export const auctionRoutes = createRouter();

// POST /api/leagues/:leagueId/roster — aggiudica un giocatore a una squadra.
auctionRoutes.post(
  "/leagues/:leagueId/roster",
  zValidator("param", leagueParam),
  zValidator("json", assignSchema),
  async (c) => {
    const db = requireDb(c);
    const { leagueId } = c.req.valid("param");
    const { fantasyTeamId, playerId, price } = c.req.valid("json");

    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));
    if (!league) {
      throw new HTTPException(404, { message: "Lega non trovata" });
    }
    if (league.status === "completed") {
      throw new HTTPException(400, {
        message: "L'asta è chiusa: impossibile aggiudicare giocatori",
      });
    }

    const [team] = await db
      .select()
      .from(fantasyTeams)
      .where(eq(fantasyTeams.id, fantasyTeamId));
    if (!team || team.leagueId !== leagueId) {
      throw new HTTPException(404, {
        message: "Squadra non trovata in questa lega",
      });
    }

    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, playerId));
    if (!player) {
      throw new HTTPException(404, { message: "Giocatore non trovato" });
    }

    // Stato attuale della rosa della squadra: prezzi e ruoli già acquistati.
    const roster = await db
      .select({ price: rosterEntries.price, role: players.role })
      .from(rosterEntries)
      .innerJoin(players, eq(rosterEntries.playerId, players.id))
      .where(eq(rosterEntries.fantasyTeamId, fantasyTeamId));

    const spent = roster.reduce((sum, r) => sum + r.price, 0);
    const ownedTotal = roster.length;
    const ownedInRole = roster.filter((r) => r.role === player.role).length;

    const totalSlots =
      league.slotsGoalkeeper +
      league.slotsDefender +
      league.slotsMidfielder +
      league.slotsForward;

    // 1) Slot del ruolo non ancora pieni.
    if (ownedInRole >= slotsForRole(league, player.role as PlayerRole)) {
      throw new HTTPException(400, {
        message: `Slot per il ruolo ${player.role} già completi`,
      });
    }

    // 2) Budget sufficiente per questa spesa.
    if (spent + price > league.budget) {
      throw new HTTPException(400, {
        message: `Budget insufficiente: disponibili ${league.budget - spent} crediti`,
      });
    }

    // 3) Deve restare almeno 1 credito per ogni slot ancora da riempire,
    //    così la rosa è sempre completabile.
    const slotsRemainingAfter = totalSlots - (ownedTotal + 1);
    const budgetRemainingAfter = league.budget - (spent + price);
    if (budgetRemainingAfter < slotsRemainingAfter) {
      throw new HTTPException(400, {
        message:
          "Spesa troppo alta: non resterebbe budget sufficiente per completare la rosa (min. 1 credito per slot)",
      });
    }

    const [entry] = await db
      .insert(rosterEntries)
      .values({ leagueId, fantasyTeamId, playerId, price })
      .returning();

    return c.json(entry, 201);
  },
);

// GET /api/leagues/:leagueId/roster — rosa completa della lega.
auctionRoutes.get(
  "/leagues/:leagueId/roster",
  zValidator("param", leagueParam),
  async (c) => {
    const db = requireDb(c);
    const { leagueId } = c.req.valid("param");

    const rows = await db
      .select({
        rosterEntryId: rosterEntries.id,
        price: rosterEntries.price,
        fantasyTeamId: fantasyTeams.id,
        teamName: fantasyTeams.name,
        playerId: players.id,
        playerName: players.name,
        realTeam: players.realTeam,
        role: players.role,
      })
      .from(rosterEntries)
      .innerJoin(
        fantasyTeams,
        eq(rosterEntries.fantasyTeamId, fantasyTeams.id),
      )
      .innerJoin(players, eq(rosterEntries.playerId, players.id))
      .where(eq(rosterEntries.leagueId, leagueId));

    return c.json(rows);
  },
);

// DELETE /api/roster/:id — svincola un giocatore (annulla l'aggiudicazione).
auctionRoutes.delete("/roster/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const { id } = c.req.valid("param");

  const deleted = await db
    .delete(rosterEntries)
    .where(eq(rosterEntries.id, id))
    .returning({ id: rosterEntries.id });

  if (deleted.length === 0) {
    throw new HTTPException(404, { message: "Acquisto non trovato" });
  }
  return c.body(null, 204);
});

// GET /api/leagues/:leagueId/budget — riepilogo budget per ogni squadra.
auctionRoutes.get(
  "/leagues/:leagueId/budget",
  zValidator("param", leagueParam),
  async (c) => {
    const db = requireDb(c);
    const { leagueId } = c.req.valid("param");

    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));
    if (!league) {
      throw new HTTPException(404, { message: "Lega non trovata" });
    }

    const teams = await db
      .select()
      .from(fantasyTeams)
      .where(eq(fantasyTeams.leagueId, leagueId));

    const entries = await db
      .select({
        fantasyTeamId: rosterEntries.fantasyTeamId,
        price: rosterEntries.price,
        role: players.role,
      })
      .from(rosterEntries)
      .innerJoin(players, eq(rosterEntries.playerId, players.id))
      .where(eq(rosterEntries.leagueId, leagueId));

    const totalSlots =
      league.slotsGoalkeeper +
      league.slotsDefender +
      league.slotsMidfielder +
      league.slotsForward;

    const summary = teams.map((team) => {
      const teamEntries = entries.filter(
        (e) => e.fantasyTeamId === team.id,
      );
      const spent = teamEntries.reduce((sum, e) => sum + e.price, 0);
      const countByRole = { P: 0, D: 0, C: 0, A: 0 };
      for (const e of teamEntries) {
        countByRole[e.role as PlayerRole] += 1;
      }
      return {
        teamId: team.id,
        teamName: team.name,
        spent,
        remaining: league.budget - spent,
        playersOwned: teamEntries.length,
        slotsRemaining: totalSlots - teamEntries.length,
        countByRole,
      };
    });

    return c.json({
      leagueId,
      budget: league.budget,
      slots: {
        P: league.slotsGoalkeeper,
        D: league.slotsDefender,
        C: league.slotsMidfielder,
        A: league.slotsForward,
        total: totalSlots,
      },
      teams: summary,
    });
  },
);

// POST /api/leagues/:leagueId/bids — registra un'offerta.
auctionRoutes.post(
  "/leagues/:leagueId/bids",
  zValidator("param", leagueParam),
  zValidator("json", bidSchema),
  async (c) => {
    const db = requireDb(c);
    const { leagueId } = c.req.valid("param");
    const body = c.req.valid("json");

    const [bid] = await db
      .insert(bids)
      .values({ ...body, leagueId })
      .returning();

    return c.json(bid, 201);
  },
);

// GET /api/leagues/:leagueId/bids — storico offerte (filtrabile per giocatore).
auctionRoutes.get(
  "/leagues/:leagueId/bids",
  zValidator("param", leagueParam),
  zValidator("query", bidQuery),
  async (c) => {
    const db = requireDb(c);
    const { leagueId } = c.req.valid("param");
    const { playerId } = c.req.valid("query");

    const filters = [
      eq(bids.leagueId, leagueId),
      playerId ? eq(bids.playerId, playerId) : undefined,
    ].filter((f) => f !== undefined);

    const rows = await db
      .select()
      .from(bids)
      .where(and(...filters))
      .orderBy(desc(bids.createdAt));

    return c.json(rows);
  },
);
