import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { leagues, organizationMembers } from "../db/schema";

export type MemberRole = "owner" | "admin" | "member";

/** Ruoli che possono amministrare un'organizzazione (config, eliminazioni). */
export const ADMIN_ROLES: MemberRole[] = ["owner", "admin"];

/** Restituisce il ruolo dell'utente nell'organizzazione, o null se non membro. */
export async function getMembership(
  db: Database,
  organizationId: string,
  userId: string,
): Promise<MemberRole | null> {
  const [row] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    );
  return row?.role ?? null;
}

/** Richiede che l'utente sia membro dell'organizzazione (403 altrimenti). */
export async function requireOrgMember(
  db: Database,
  organizationId: string,
  userId: string,
): Promise<MemberRole> {
  const role = await getMembership(db, organizationId, userId);
  if (!role) {
    throw new HTTPException(403, {
      message: "Non fai parte di questa organizzazione",
    });
  }
  return role;
}

/** Richiede che l'utente abbia uno dei ruoli indicati nell'organizzazione. */
export async function requireOrgRole(
  db: Database,
  organizationId: string,
  userId: string,
  roles: MemberRole[],
): Promise<MemberRole> {
  const role = await requireOrgMember(db, organizationId, userId);
  if (!roles.includes(role)) {
    throw new HTTPException(403, {
      message: "Permessi insufficienti per questa operazione",
    });
  }
  return role;
}

export interface League {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  season: string;
  status: "setup" | "auction" | "completed";
  budget: number;
  slotsGoalkeeper: number;
  slotsDefender: number;
  slotsMidfielder: number;
  slotsForward: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Carica una lega e verifica che l'utente sia membro dell'organizzazione a cui
 * appartiene. Restituisce la lega (già caricata) e il ruolo dell'utente.
 * 404 se la lega non esiste, 403 se l'utente non è membro.
 */
export async function requireLeagueMember(
  db: Database,
  leagueId: string,
  userId: string,
): Promise<{ league: League; role: MemberRole }> {
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId));
  if (!league) {
    throw new HTTPException(404, { message: "Lega non trovata" });
  }
  const role = await requireOrgMember(db, league.organizationId, userId);
  return { league, role };
}
