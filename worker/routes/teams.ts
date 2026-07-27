import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { createRouter, requireDb, requireUser } from "../lib/app";
import { requireLeagueMember } from "../lib/authz";
import { idParam } from "../lib/validation";
import { fantasyTeams, players, rosterEntries } from "../db/schema";

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

/** Carica una squadra verificando l'accesso alla sua lega. */
async function loadTeamWithAccess(
  db: ReturnType<typeof requireDb>,
  teamId: string,
  userId: string,
) {
  const [team] = await db
    .select()
    .from(fantasyTeams)
    .where(eq(fantasyTeams.id, teamId));
  if (!team) {
    throw new HTTPException(404, { message: "Squadra non trovata" });
  }
  const { league } = await requireLeagueMember(db, team.leagueId, userId);
  return { team, league };
}

// GET /api/leagues/:leagueId/teams
teamsRoutes.get(
  "/leagues/:leagueId/teams",
  zValidator("param", leagueParam),
  async (c) => {
    const db = requireDb(c);
    const user = requireUser(c);
    const { leagueId } = c.req.valid("param");

    await requireLeagueMember(db, leagueId, user.id);

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
    const user = requireUser(c);
    const { leagueId } = c.req.valid("param");
    const body = c.req.valid("json");

    await requireLeagueMember(db, leagueId, user.id);

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
  const user = requireUser(c);
  const { id } = c.req.valid("param");

  const { team, league } = await loadTeamWithAccess(db, id, user.id);

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
  const total = league.budget;

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
    const user = requireUser(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    await loadTeamWithAccess(db, id, user.id);

    const [team] = await db
      .update(fantasyTeams)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(fantasyTeams.id, id))
      .returning();

    return c.json(team);
  },
);

// DELETE /api/teams/:id
teamsRoutes.delete("/teams/:id", zValidator("param", idParam), async (c) => {
  const db = requireDb(c);
  const user = requireUser(c);
  const { id } = c.req.valid("param");

  await loadTeamWithAccess(db, id, user.id);

  await db.delete(fantasyTeams).where(eq(fantasyTeams.id, id));
  return c.body(null, 204);
});
