import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError } from "../lib/api";
import type { LeagueStatus, Role, RosterEntry } from "../lib/api";
import { useLoad } from "../lib/useLoad";
import { ROLE_LABELS, STATUS_LABELS } from "../lib/util";

const ROLES: Role[] = ["P", "D", "C", "A"];

export function LeaguePage() {
  const { leagueId = "" } = useParams();

  const loader = useCallback(async () => {
    const league = await api.getLeague(leagueId);
    const [teams, players, roster, budget] = await Promise.all([
      api.listTeams(leagueId),
      api.listPlayers({ season: league.season }),
      api.listRoster(leagueId),
      api.getBudget(leagueId),
    ]);
    return { league, teams, players, roster, budget };
  }, [leagueId]);

  const { data, error, loading, reload } = useLoad(loader);

  // Form: nuova squadra
  const [teamName, setTeamName] = useState("");
  // Form: nuovo giocatore (listone)
  const [pName, setPName] = useState("");
  const [pTeam, setPTeam] = useState("");
  const [pRole, setPRole] = useState<Role>("P");
  const [pQuot, setPQuot] = useState(1);
  // Form: aggiudicazione
  const [aTeam, setATeam] = useState("");
  const [aPlayer, setAPlayer] = useState("");
  const [aPrice, setAPrice] = useState(1);

  const [actionError, setActionError] = useState<string | null>(null);

  const ownedPlayerIds = useMemo(
    () => new Set((data?.roster ?? []).map((r) => r.playerId)),
    [data],
  );
  const availablePlayers = useMemo(
    () => (data?.players ?? []).filter((p) => !ownedPlayerIds.has(p.id)),
    [data, ownedPlayerIds],
  );
  const rosterByTeam = useMemo(() => {
    const map = new Map<string, RosterEntry[]>();
    for (const entry of data?.roster ?? []) {
      const list = map.get(entry.fantasyTeamId) ?? [];
      list.push(entry);
      map.set(entry.fantasyTeamId, list);
    }
    return map;
  }, [data]);

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Errore");
    }
  };

  const changeStatus = (status: LeagueStatus) =>
    run(() => api.updateLeague(leagueId, { status }));

  const createTeam = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api.createTeam(leagueId, { name: teamName });
      setTeamName("");
    });
  };

  const createPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    run(async () => {
      await api.createPlayer({
        name: pName,
        realTeam: pTeam,
        role: pRole,
        baseQuotation: pQuot,
        season: data.league.season,
      });
      setPName("");
      setPTeam("");
      setPQuot(1);
    });
  };

  const assign = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api.assignPlayer(leagueId, {
        fantasyTeamId: aTeam,
        playerId: aPlayer,
        price: aPrice,
      });
      setAPlayer("");
      setAPrice(1);
    });
  };

  const onSelectPlayer = (playerId: string) => {
    setAPlayer(playerId);
    const p = availablePlayers.find((x) => x.id === playerId);
    if (p) setAPrice(p.baseQuotation);
  };

  if (loading) return <div className="alert info">Caricamento…</div>;
  if (error) return <div className="alert error">{error}</div>;
  if (!data) return null;

  const { league, teams, players, budget } = data;

  return (
    <div className="stack">
      <div className="breadcrumb">
        <Link to="/">Organizzazioni</Link>{" "}
        <Link to={`/organizations/${league.organizationId}`}>/ organizzazione</Link>{" "}
        <span className="muted">/ {league.name}</span>
      </div>

      <div className="spread">
        <div>
          <h1>{league.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {league.season} · {league.budget} crediti · rosa{" "}
            {league.slotsGoalkeeper}/{league.slotsDefender}/
            {league.slotsMidfielder}/{league.slotsForward}
          </p>
        </div>
        <div className="row">
          <span className={`badge status-${league.status}`}>
            {STATUS_LABELS[league.status]}
          </span>
          {league.status === "setup" && (
            <button className="primary sm" onClick={() => changeStatus("auction")}>
              Avvia asta
            </button>
          )}
          {league.status === "auction" && (
            <button className="sm" onClick={() => changeStatus("completed")}>
              Chiudi asta
            </button>
          )}
          {league.status === "completed" && (
            <button className="ghost sm" onClick={() => changeStatus("auction")}>
              Riapri asta
            </button>
          )}
        </div>
      </div>

      {actionError && <div className="alert error">{actionError}</div>}

      {/* Budget per squadra */}
      <div className="section-title">
        <h2>Budget squadre</h2>
      </div>
      {budget.teams.length === 0 ? (
        <div className="alert info">Aggiungi squadre per vedere i budget.</div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Squadra</th>
                <th>Speso</th>
                <th>Residuo</th>
                <th>Rosa</th>
                <th>P</th>
                <th>D</th>
                <th>C</th>
                <th>A</th>
              </tr>
            </thead>
            <tbody>
              {budget.teams.map((t) => (
                <tr key={t.teamId}>
                  <td>{t.teamName}</td>
                  <td>{t.spent}</td>
                  <td>
                    <div className="row" style={{ gap: "0.5rem" }}>
                      <strong>{t.remaining}</strong>
                      <div className="meter" style={{ width: 70 }}>
                        <span
                          style={{
                            width: `${(t.remaining / league.budget) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    {t.playersOwned}/{budget.slots.total}
                  </td>
                  <td>
                    {t.countByRole.P}/{budget.slots.P}
                  </td>
                  <td>
                    {t.countByRole.D}/{budget.slots.D}
                  </td>
                  <td>
                    {t.countByRole.C}/{budget.slots.C}
                  </td>
                  <td>
                    {t.countByRole.A}/{budget.slots.A}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Squadre */}
      <div className="section-title">
        <h2>Squadre</h2>
      </div>
      <div className="card">
        <form onSubmit={createTeam} className="row">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Nome squadra"
            required
            style={{ maxWidth: 260 }}
          />
          <button className="primary" type="submit">
            Aggiungi squadra
          </button>
        </form>
      </div>

      {/* Aggiudicazione */}
      <div className="section-title">
        <h2>Aggiudica un giocatore</h2>
      </div>
      <div className="card">
        {teams.length === 0 || availablePlayers.length === 0 ? (
          <div className="alert info">
            {teams.length === 0
              ? "Aggiungi almeno una squadra."
              : "Nessun giocatore disponibile: aggiungine al listone qui sotto."}
          </div>
        ) : (
          <form onSubmit={assign}>
            <div className="field-row">
              <div>
                <label htmlFor="a-team">Squadra</label>
                <select
                  id="a-team"
                  value={aTeam}
                  onChange={(e) => setATeam(e.target.value)}
                  required
                >
                  <option value="">— scegli —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="a-player">Giocatore</label>
                <select
                  id="a-player"
                  value={aPlayer}
                  onChange={(e) => onSelectPlayer(e.target.value)}
                  required
                >
                  <option value="">— scegli —</option>
                  {availablePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.realTeam}) · {p.role} · q.{p.baseQuotation}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="a-price">Prezzo</label>
                <input
                  id="a-price"
                  type="number"
                  min={1}
                  value={aPrice}
                  onChange={(e) => setAPrice(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <button className="primary" type="submit">
              Aggiudica
            </button>
          </form>
        )}
      </div>

      {/* Rose */}
      {teams.length > 0 && (
        <>
          <div className="section-title">
            <h2>Rose</h2>
          </div>
          <div className="grid">
            {teams.map((team) => {
              const entries = rosterByTeam.get(team.id) ?? [];
              return (
                <div key={team.id} className="card">
                  <h3>{team.name}</h3>
                  {entries.length === 0 ? (
                    <span className="muted">Nessun giocatore.</span>
                  ) : (
                    <table>
                      <tbody>
                        {entries.map((e) => (
                          <tr key={e.rosterEntryId}>
                            <td>
                              <span className={`badge ${e.role}`}>{e.role}</span>
                            </td>
                            <td>{e.playerName}</td>
                            <td>{e.price}</td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                className="danger sm"
                                onClick={() =>
                                  run(() => api.releasePlayer(e.rosterEntryId))
                                }
                                title="Svincola"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Listone */}
      <div className="section-title">
        <h2>Listone ({players.length})</h2>
      </div>
      <div className="card">
        <form onSubmit={createPlayer}>
          <div className="field-row">
            <div>
              <label htmlFor="p-name">Nome</label>
              <input
                id="p-name"
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="Giocatore"
                required
              />
            </div>
            <div>
              <label htmlFor="p-team">Squadra reale</label>
              <input
                id="p-team"
                value={pTeam}
                onChange={(e) => setPTeam(e.target.value)}
                placeholder="Es. Inter"
                required
              />
            </div>
            <div>
              <label htmlFor="p-role">Ruolo</label>
              <select
                id="p-role"
                value={pRole}
                onChange={(e) => setPRole(e.target.value as Role)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="p-quot">Quotazione</label>
              <input
                id="p-quot"
                type="number"
                min={1}
                value={pQuot}
                onChange={(e) => setPQuot(Number(e.target.value))}
                required
              />
            </div>
          </div>
          <button className="primary" type="submit">
            Aggiungi al listone
          </button>
        </form>
      </div>
    </div>
  );
}
