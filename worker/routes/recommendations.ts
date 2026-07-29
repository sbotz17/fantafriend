import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { createRouter, requireDb, requireUser } from "../lib/app";
import { requireLeagueMember } from "../lib/authz";
import { matchPlayer } from "../lib/matching";
import { evaluateBid, suggestCalls } from "../lib/valuation";
import type {
  LeagueConfig,
  Role,
  TeamState,
  ValuedPlayer,
} from "../lib/valuation";
import type { Database } from "../db/client";
import {
  auctionLiveState,
  fantasyTeams,
  players,
  rosterEntries,
} from "../db/schema";

const leagueParam = z.object({ leagueId: z.uuid() });

const recommendQuery = z.object({
  fantasyTeamId: z.uuid(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const evaluateSchema = z.object({
  fantasyTeamId: z.uuid(),
  // Nome così come letto dalla pagina di Fantalab.
  playerName: z.string().min(1).max(120),
  realTeam: z.string().max(80).optional(),
  currentBid: z.number().int().min(0).nullish(),
  /**
   * Da dove arriva la chiamata. Solo le letture automatiche aggiornano lo
   * stato condiviso della lega: se lo facesse anche la digitazione manuale
   * nella Sala d'asta, la dashboard finirebbe per rileggere quanto appena
   * scritto dall'utente.
   */
  source: z.enum(["extension", "manual"]).optional(),
});

interface AuctionState {
  league: LeagueConfig;
  team: TeamState;
  /** Giocatori del listone non ancora assegnati in questa lega. */
  available: ValuedPlayer[];
}

/**
 * Ricostruisce lo stato dell'asta necessario ai consigli: configurazione della
 * lega, situazione della squadra che deve chiamare e giocatori ancora liberi.
 */
async function loadAuctionState(
  db: Database,
  leagueId: string,
  fantasyTeamId: string,
  userId: string,
): Promise<AuctionState> {
  const { league } = await requireLeagueMember(db, leagueId, userId);

  const [team] = await db
    .select()
    .from(fantasyTeams)
    .where(eq(fantasyTeams.id, fantasyTeamId));
  if (!team || team.leagueId !== leagueId) {
    throw new HTTPException(404, {
      message: "Squadra non trovata in questa lega",
    });
  }

  const [catalogue, taken] = await Promise.all([
    db.select().from(players).where(eq(players.season, league.season)),
    db
      .select({
        playerId: rosterEntries.playerId,
        price: rosterEntries.price,
        fantasyTeamId: rosterEntries.fantasyTeamId,
        role: players.role,
      })
      .from(rosterEntries)
      .innerJoin(players, eq(rosterEntries.playerId, players.id))
      .where(eq(rosterEntries.leagueId, leagueId)),
  ]);

  const takenIds = new Set(taken.map((t) => t.playerId));
  const mine = taken.filter((t) => t.fantasyTeamId === fantasyTeamId);

  const ownedByRole: Record<Role, number> = { P: 0, D: 0, C: 0, A: 0 };
  let spent = 0;
  for (const entry of mine) {
    ownedByRole[entry.role as Role] += 1;
    spent += entry.price;
  }

  return {
    league: {
      budget: league.budget,
      slots: {
        P: league.slotsGoalkeeper,
        D: league.slotsDefender,
        C: league.slotsMidfielder,
        A: league.slotsForward,
      },
    },
    team: { remaining: league.budget - spent, ownedByRole },
    available: catalogue
      .filter((p) => !takenIds.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        realTeam: p.realTeam,
        role: p.role as Role,
        baseQuotation: p.baseQuotation,
        fvm: p.fvm,
        fantamedia: p.fantamedia,
      })),
  };
}

export const recommendationsRoutes = createRouter();

// GET /api/leagues/:leagueId/recommendations?fantasyTeamId=…
// Chi conviene chiamare adesso, in ordine di priorità.
recommendationsRoutes.get(
  "/leagues/:leagueId/recommendations",
  zValidator("param", leagueParam),
  zValidator("query", recommendQuery),
  async (c) => {
    const db = requireDb(c);
    const user = requireUser(c);
    const { leagueId } = c.req.valid("param");
    const { fantasyTeamId, limit } = c.req.valid("query");

    const state = await loadAuctionState(db, leagueId, fantasyTeamId, user.id);
    const suggestions = suggestCalls(
      state.available,
      state.league,
      state.team,
      limit ?? 10,
    );

    return c.json({
      budgetRemaining: state.team.remaining,
      ownedByRole: state.team.ownedByRole,
      suggestions: suggestions.map((s) => ({
        playerId: s.player.id,
        name: s.player.name,
        realTeam: s.player.realTeam,
        role: s.player.role,
        fairValue: s.threshold.fair,
        maxBid: s.threshold.max,
        reason: s.threshold.reason,
        score: s.score,
      })),
    });
  },
);

// GET /api/leagues/:leagueId/live
// Ultima chiamata pubblicata dalla lettura automatica. La Sala d'asta la
// interroga periodicamente per autocompilare i campi.
recommendationsRoutes.get(
  "/leagues/:leagueId/live",
  zValidator("param", leagueParam),
  async (c) => {
    const db = requireDb(c);
    const user = requireUser(c);
    const { leagueId } = c.req.valid("param");

    await requireLeagueMember(db, leagueId, user.id);

    const [row] = await db
      .select()
      .from(auctionLiveState)
      .where(eq(auctionLiveState.leagueId, leagueId));

    if (!row) return c.json({ active: false });

    return c.json({
      active: true,
      playerName: row.playerName,
      currentBid: row.currentBid,
      updatedAt: row.updatedAt,
      /** Secondi trascorsi: permette di distinguere una diretta da un residuo. */
      ageSeconds: Math.max(
        0,
        Math.round((Date.now() - row.updatedAt.getTime()) / 1000),
      ),
    });
  },
);

// POST /api/leagues/:leagueId/evaluate
// Riceve il giocatore attualmente all'asta (nome letto da Fantalab) e
// l'offerta corrente, e restituisce il verdetto immediato.
recommendationsRoutes.post(
  "/leagues/:leagueId/evaluate",
  zValidator("param", leagueParam),
  zValidator("json", evaluateSchema),
  async (c) => {
    const db = requireDb(c);
    const user = requireUser(c);
    const { leagueId } = c.req.valid("param");
    const { fantasyTeamId, playerName, realTeam, currentBid, source } =
      c.req.valid("json");

    const state = await loadAuctionState(db, leagueId, fantasyTeamId, user.id);

    const match = matchPlayer(playerName, state.available, realTeam);

    // Le letture automatiche pubblicano la chiamata in corso, così la Sala
    // d'asta aperta altrove può autocompilarsi.
    if (source !== "manual") {
      await db
        .insert(auctionLiveState)
        .values({
          leagueId,
          playerName,
          currentBid: currentBid ?? null,
          matchedPlayerId: match?.player.id ?? null,
          updatedByUserId: user.id,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: auctionLiveState.leagueId,
          set: {
            playerName,
            currentBid: currentBid ?? null,
            matchedPlayerId: match?.player.id ?? null,
            updatedByUserId: user.id,
            updatedAt: new Date(),
          },
        });
    }

    if (!match) {
      return c.json({
        matched: false,
        query: playerName,
        message:
          "Giocatore non riconosciuto fra quelli disponibili (già preso o assente dal listone).",
      });
    }

    const availableInRole = state.available.filter(
      (p) => p.role === match.player.role,
    ).length;

    const evaluation = evaluateBid(
      match.player,
      state.league,
      state.team,
      availableInRole,
      currentBid ?? null,
    );

    return c.json({
      matched: true,
      confidence: Math.round(match.confidence * 100) / 100,
      player: {
        id: match.player.id,
        name: match.player.name,
        realTeam: match.player.realTeam,
        role: match.player.role,
      },
      currentBid: evaluation.currentBid,
      fairValue: evaluation.fair,
      maxBid: evaluation.max,
      verdict: evaluation.verdict,
      advice: evaluation.advice,
      reason: evaluation.reason,
      budgetRemaining: state.team.remaining,
    });
  },
);
