// Client HTTP tipizzato per l'API del Worker. Le richieste sono same-origin, ma
// impostiamo comunque `credentials: "include"` per portare il cookie di sessione.

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers:
      options.body !== undefined
        ? { "content-type": "application/json", ...options.headers }
        : options.headers,
    ...options,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new ApiError(extractErrorMessage(data, res.status), res.status);
  }

  return data as T;
}

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.error === "string") {
      return obj.error;
    }
    // Errori di validazione Zod: `{ success: false, error: {...} }`.
    if (obj.success === false) {
      return "Dati non validi";
    }
  }
  return `Errore ${status}`;
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

// ---- Tipi ----

export type Role = "P" | "D" | "C" | "A";
export type LeagueStatus = "setup" | "auction" | "completed";

export interface User {
  id: string;
  email: string;
  name: string;
}

export type MemberRole = "owner" | "admin" | "member";

export interface Member {
  userId: string;
  role: MemberRole;
  name: string;
  email: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string | null;
  role: "admin" | "member";
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface InvitationWithToken extends Invitation {
  token: string;
}

export interface InvitationPreview {
  organizationId: string;
  organizationName: string;
  role: MemberRole;
  email: string | null;
  status: string;
  valid: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface League {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  season: string;
  status: LeagueStatus;
  budget: number;
  slotsGoalkeeper: number;
  slotsDefender: number;
  slotsMidfielder: number;
  slotsForward: number;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  leagueId: string;
  name: string;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  name: string;
  realTeam: string;
  role: Role;
  baseQuotation: number;
  season: string;
}

export interface RosterEntry {
  rosterEntryId: string;
  price: number;
  fantasyTeamId: string;
  teamName: string;
  playerId: string;
  playerName: string;
  realTeam: string;
  role: Role;
}

export type Verdict = "conviene" | "limite" | "lascia" | "non_serve";

export interface Suggestion {
  playerId: string;
  name: string;
  realTeam: string;
  role: Role;
  fairValue: number;
  maxBid: number;
  reason: string;
  score: number;
}

export interface Recommendations {
  budgetRemaining: number;
  ownedByRole: Record<Role, number>;
  suggestions: Suggestion[];
}

export interface Evaluation {
  matched: boolean;
  /** Presente quando il nome non è stato riconosciuto. */
  query?: string;
  message?: string;
  confidence?: number;
  player?: { id: string; name: string; realTeam: string; role: Role };
  currentBid?: number | null;
  fairValue?: number;
  maxBid?: number;
  verdict?: Verdict;
  advice?: string;
  reason?: string;
  budgetRemaining?: number;
}

export interface LiveState {
  active: boolean;
  playerName?: string;
  currentBid?: number | null;
  updatedAt?: string;
  /** Secondi dall'ultimo aggiornamento: serve a capire se è ancora "in diretta". */
  ageSeconds?: number;
}

export interface BudgetSummary {
  leagueId: string;
  budget: number;
  slots: { P: number; D: number; C: number; A: number; total: number };
  teams: {
    teamId: string;
    teamName: string;
    spent: number;
    remaining: number;
    playersOwned: number;
    slotsRemaining: number;
    countByRole: Record<Role, number>;
  }[];
}

// ---- Endpoint ----

export const api = {
  // Auth
  me: () => request<User>("/auth/me"),
  login: (email: string, password: string) =>
    request<User>("/auth/login", { method: "POST", ...json({ email, password }) }),
  signup: (email: string, name: string, password: string) =>
    request<User>("/auth/signup", {
      method: "POST",
      ...json({ email, name, password }),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),

  // Organizzazioni
  listOrganizations: () => request<Organization[]>("/organizations"),
  getOrganization: (id: string) =>
    request<Organization>(`/organizations/${id}`),
  createOrganization: (body: { name: string; slug: string }) =>
    request<Organization>("/organizations", { method: "POST", ...json(body) }),

  // Membri
  listMembers: (orgId: string) =>
    request<Member[]>(`/organizations/${orgId}/members`),
  updateMemberRole: (orgId: string, userId: string, role: "admin" | "member") =>
    request<unknown>(`/organizations/${orgId}/members/${userId}`, {
      method: "PATCH",
      ...json({ role }),
    }),
  removeMember: (orgId: string, userId: string) =>
    request<void>(`/organizations/${orgId}/members/${userId}`, {
      method: "DELETE",
    }),

  // Inviti
  createInvitation: (
    orgId: string,
    body: { email?: string; role: "admin" | "member" },
  ) =>
    request<InvitationWithToken>(`/organizations/${orgId}/invitations`, {
      method: "POST",
      ...json(body),
    }),
  listInvitations: (orgId: string) =>
    request<Invitation[]>(`/organizations/${orgId}/invitations`),
  revokeInvitation: (invitationId: string) =>
    request<void>(`/invitations/${invitationId}`, { method: "DELETE" }),
  getInvitationPreview: (token: string) =>
    request<InvitationPreview>(`/invitations/token/${token}`),
  acceptInvitation: (token: string) =>
    request<Organization>("/invitations/accept", {
      method: "POST",
      ...json({ token }),
    }),

  // Leghe
  listLeagues: (organizationId: string) =>
    request<League[]>(`/leagues?organizationId=${organizationId}`),
  getLeague: (id: string) => request<League>(`/leagues/${id}`),
  createLeague: (body: {
    organizationId: string;
    name: string;
    slug: string;
    season: string;
    budget?: number;
    slotsGoalkeeper?: number;
    slotsDefender?: number;
    slotsMidfielder?: number;
    slotsForward?: number;
  }) => request<League>("/leagues", { method: "POST", ...json(body) }),
  updateLeague: (id: string, body: Partial<Pick<League, "status">>) =>
    request<League>(`/leagues/${id}`, { method: "PATCH", ...json(body) }),

  // Squadre
  listTeams: (leagueId: string) =>
    request<Team[]>(`/leagues/${leagueId}/teams`),
  createTeam: (leagueId: string, body: { name: string }) =>
    request<Team>(`/leagues/${leagueId}/teams`, {
      method: "POST",
      ...json(body),
    }),

  // Giocatori
  listPlayers: (params: { season?: string; role?: Role; search?: string }) => {
    const q = new URLSearchParams();
    if (params.season) q.set("season", params.season);
    if (params.role) q.set("role", params.role);
    if (params.search) q.set("search", params.search);
    const qs = q.toString();
    return request<Player[]>(`/players${qs ? `?${qs}` : ""}`);
  },
  createPlayer: (body: {
    name: string;
    realTeam: string;
    role: Role;
    baseQuotation?: number;
    season: string;
  }) => request<Player>("/players", { method: "POST", ...json(body) }),
  bulkCreatePlayers: (
    players: {
      name: string;
      realTeam: string;
      role: Role;
      baseQuotation?: number;
      season: string;
    }[],
  ) =>
    request<{ requested: number; inserted: number }>("/players/bulk", {
      method: "POST",
      ...json({ players }),
    }),

  // Asta / rose / budget
  listRoster: (leagueId: string) =>
    request<RosterEntry[]>(`/leagues/${leagueId}/roster`),
  assignPlayer: (
    leagueId: string,
    body: { fantasyTeamId: string; playerId: string; price: number },
  ) =>
    request<unknown>(`/leagues/${leagueId}/roster`, {
      method: "POST",
      ...json(body),
    }),
  releasePlayer: (rosterEntryId: string) =>
    request<void>(`/roster/${rosterEntryId}`, { method: "DELETE" }),
  getBudget: (leagueId: string) =>
    request<BudgetSummary>(`/leagues/${leagueId}/budget`),

  // Consigli d'asta
  getRecommendations: (leagueId: string, fantasyTeamId: string, limit = 8) =>
    request<Recommendations>(
      `/leagues/${leagueId}/recommendations?fantasyTeamId=${fantasyTeamId}&limit=${limit}`,
    ),
  evaluate: (
    leagueId: string,
    body: {
      fantasyTeamId: string;
      playerName: string;
      realTeam?: string;
      currentBid?: number | null;
      source?: "extension" | "manual";
    },
  ) =>
    request<Evaluation>(`/leagues/${leagueId}/evaluate`, {
      method: "POST",
      ...json(body),
    }),
  getLiveState: (leagueId: string) =>
    request<LiveState>(`/leagues/${leagueId}/live`),
};
