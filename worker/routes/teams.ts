import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { createRouter, requireDb } from "../lib/app";
import { idParam } from "../lib/validation";
import { fantasyTeams, leagues, players, rosterEntries } from "../db/schema";

const leagueParam = z.object({ leagueId: z.uuid() });

const createSchema = z.object({
  name: z.string().min(1).max(120),
  ownerUserId: z.uuid().nullish(),
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    // `null` slega la squadra dall'utente proprietario.
    ownerUserId: z.uuid().nullish(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nessun campo da aggiornare",
  });

export const teamsRoutes = createRouter();

// GET /api/leagues/:leagueId/teams
teamsRoutes.get(
  "/leagues/:leagueId/teams",
  zValidator("param", leagueParam),
  async (c) => {
    const db = requireDb(c);
    const { leagueId } = c.req.valid("param");

    const rows = await db
      .select()
      .from(fantasyTeams)
      .where(eq(fantasyTeams.leagueId, leagueId));

    return c.json(rows);
  },
);

// POST /api/leagues/:leagueId/teams
teamsRoutes.post(
  "/leagues/:leagueId/teams",
  zValidator("param", leagueParam),
  zValidator("json", createSchema),
  async (c) => {
    const db = requireDb(c);
    const { leagueId } = c.req.valid("param");
    const body = c.req.valid("json");

    const [league] = await db
      .select({ id: leagues.id })
      .from(leagues)
      .where(eq(leagues.id, leagueId));
    if (!league) {
      throw new HTTPException(404, { message: "Lega non trovata" });
    }

    const [team] = await db
      .insert(fantasyTeams)
      .values({ ...body, leagueId })
      .returning();

    return c.json(team, 201);
  },
);

// GET /api/teams/:id — dettaglio con rosa e budget residuo.
teamsRoutes.get("/teams/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const { id } = c.req.valid("param");

  const [team] = await db
    .select()
    .from(fantasyTeams)
    .where(eq(fantasyTeams.id, id));
  if (!team) {
    throw new HTTPException(404, { message: "Squadra non trovata" });
  }

  const [league] = await db
    .select({ budget: leagues.budget })
    .from(leagues)
    .where(eq(leagues.id, team.leagueId));

  const roster = await db
    .select({
      rosterEntryId: rosterEntries.id,
      price: rosterEntries.price,
      playerId: players.id,
      playerName: players.name,
      realTeam: players.realTeam,
      role: players.role,
    })
    .from(rosterEntries)
    .innerJoin(players, eq(rosterEntries.playerId, players.id))
    .where(eq(rosterEntries.fantasyTeamId, id));

  const spent = roster.reduce((sum, r) => sum + r.price, 0);
  const total = league?.budget ?? 0;

  return c.json({
    ...team,
    budget: { total, spent, remaining: total - spent },
    roster,
  });
});

// PATCH /api/teams/:id
teamsRoutes.patch(
  "/teams/:id",
  zValidator("param", idParam),
  zValidator("json", updateSchema),
  async (c) => {
    const db = requireDb(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const [team] = await db
      .update(fantasyTeams)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(fantasyTeams.id, id))
      .returning();

    if (!team) {
      throw new HTTPException(404, { message: "Squadra non trovata" });
    }
    return c.json(team);
  },
);

// DELETE /api/teams/:id
teamsRoutes.delete("/teams/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const { id } = c.req.valid("param");

  const deleted = await db
    .delete(fantasyTeams)
    .where(eq(fantasyTeams.id, id))
    .returning({ id: fantasyTeams.id });

  if (deleted.length === 0) {
    throw new HTTPException(404, { message: "Squadra non trovata" });
  }
  return c.body(null, 204);
});
