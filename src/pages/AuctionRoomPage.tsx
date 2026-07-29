import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError } from "../lib/api";
import type {
  Evaluation,
  LiveState,
  Recommendations,
  Role,
} from "../lib/api";
import { useLoad } from "../lib/useLoad";
import { ROLE_LABELS } from "../lib/util";

const ROLES: Role[] = ["P", "D", "C", "A"];

const VERDICT_LABEL: Record<string, string> = {
  conviene: "RILANCIA",
  limite: "AL LIMITE",
  lascia: "LASCIA",
  non_serve: "NON SERVE",
};

const VERDICT_CLASS: Record<string, string> = {
  conviene: "ok",
  limite: "warn",
  lascia: "no",
  non_serve: "no",
};

/**
 * Sala d'asta: il "cruscotto" da tenere aperto durante l'asta.
 *
 * Gli eventi si inseriscono a mano — si digita il giocatore chiamato e
 * l'offerta corrente — e la pagina risponde subito con il verdetto e la soglia
 * massima. Serve a validare la logica strategica indipendentemente dalla
 * lettura automatica della schermata, che è la parte più fragile.
 */
export function AuctionRoomPage() {
  const { leagueId = "" } = useParams();

  const baseLoader = useCallback(async () => {
    const league = await api.getLeague(leagueId);
    const [teams, budget, roster] = await Promise.all([
      api.listTeams(leagueId),
      api.getBudget(leagueId),
      api.listRoster(leagueId),
    ]);
    return { league, teams, budget, roster };
  }, [leagueId]);

  const { data, error, loading, reload } = useLoad(baseLoader);

  // La squadra per cui stiamo ragionando (di norma la propria). Finché
  // l'utente non sceglie, si usa la prima della lega: valore derivato, così
  // non serve un effetto per inizializzarlo.
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const myTeamId = selectedTeamId || data?.teams[0]?.id || "";

  const [playerName, setPlayerName] = useState("");
  const [bid, setBid] = useState(1);

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [recs, setRecs] = useState<Recommendations | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Sincronizzazione con la lettura automatica fatta dall'estensione.
  const [syncOn, setSyncOn] = useState(true);
  const [live, setLive] = useState<LiveState | null>(null);
  // Ultima chiamata già riversata nei campi: evita di sovrascrivere in
  // continuazione (e di annullare una correzione manuale) finché il dato
  // pubblicato resta lo stesso.
  const appliedRef = useRef("");

  useEffect(() => {
    if (!syncOn || !leagueId) return;

    let active = true;
    const tick = async () => {
      try {
        const state = await api.getLiveState(leagueId);
        if (!active) return;
        setLive(state);

        if (!state.active || !state.playerName) return;
        const key = `${state.playerName}|${state.currentBid ?? ""}|${state.updatedAt ?? ""}`;
        if (key === appliedRef.current) return;
        appliedRef.current = key;

        setPlayerName(state.playerName);
        if (typeof state.currentBid === "number") {
          setBid(Math.max(1, state.currentBid));
        }
      } catch {
        // Errori momentanei di rete: il tentativo successivo riproverà.
      }
    };

    void tick();
    const id = setInterval(() => void tick(), 1500);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [leagueId, syncOn]);

  // Classifica di chi conviene chiamare: dipende solo dalla squadra scelta e
  // dallo stato dell'asta, quindi si ricarica dopo ogni aggiudicazione.
  const rosterCount = data?.roster.length ?? 0;
  useEffect(() => {
    if (!myTeamId) return;
    let active = true;
    api
      .getRecommendations(leagueId, myTeamId)
      .then((r) => {
        if (active) setRecs(r);
      })
      .catch(() => {
        if (active) setRecs(null);
      });
    return () => {
      active = false;
    };
  }, [leagueId, myTeamId, rosterCount]);

  // Valutazione del giocatore in asta, con piccolo ritardo per non interrogare
  // l'API a ogni tasto premuto.
  const evalSeq = useRef(0);
  useEffect(() => {
    const name = playerName.trim();
    const seq = ++evalSeq.current;
    const timer = setTimeout(() => {
      if (!myTeamId || name.length < 2) {
        if (seq === evalSeq.current) setEvaluation(null);
        return;
      }
      api
        .evaluate(leagueId, {
          fantasyTeamId: myTeamId,
          playerName: name,
          currentBid: bid,
          // La dashboard consulta soltanto: non deve ripubblicare lo stato,
          // altrimenti si rileggerebbe da sola.
          source: "manual",
        })
        .then((res) => {
          // Ignora le risposte arrivate fuori ordine.
          if (seq === evalSeq.current) setEvaluation(res);
        })
        .catch((err) => {
          if (seq === evalSeq.current) {
            setActionError(err instanceof ApiError ? err.message : "Errore");
          }
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [leagueId, myTeamId, playerName, bid]);

  const myBudget = useMemo(
    () => data?.budget.teams.find((t) => t.teamId === myTeamId) ?? null,
    [data, myTeamId],
  );

  /** Registra l'aggiudicazione e azzera il pannello per la chiamata seguente. */
  const award = async (toTeamId: string) => {
    if (!evaluation?.player) return;
    setAssigning(true);
    setActionError(null);
    try {
      await api.assignPlayer(leagueId, {
        fantasyTeamId: toTeamId,
        playerId: evaluation.player.id,
        price: bid,
      });
      setPlayerName("");
      setBid(1);
      setEvaluation(null);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Errore");
    } finally {
      setAssigning(false);
    }
  };

  const pickSuggestion = (name: string, startBid: number) => {
    setPlayerName(name);
    setBid(Math.max(1, startBid));
  };

  if (loading) return <div className="alert info">Caricamento…</div>;
  if (error) return <div className="alert error">{error}</div>;
  if (!data) return null;

  const { league, teams, budget } = data;
  const verdict = evaluation?.verdict;
  // Consideriamo "in diretta" una lettura arrivata negli ultimi 15 secondi.
  const liveFresh =
    !!live?.active && (live.ageSeconds ?? Number.MAX_SAFE_INTEGER) <= 15;
  const overThreshold =
    evaluation?.matched && evaluation.maxBid !== undefined && bid > evaluation.maxBid;

  return (
    <div className="stack">
      <div className="breadcrumb">
        <Link to="/">Organizzazioni</Link>{" "}
        <Link to={`/organizations/${league.organizationId}`}>/ organizzazione</Link>{" "}
        <Link to={`/leagues/${leagueId}`}>/ {league.name}</Link>{" "}
        <span className="muted">/ sala d'asta</span>
      </div>

      <div className="spread">
        <div>
          <h1>Sala d'asta</h1>
          <p className="muted" style={{ margin: 0 }}>
            Inserisci chi è stato chiamato e a quanto: il consiglio si aggiorna
            da solo.
          </p>
        </div>
        <div>
          <label htmlFor="my-team">Ragiono per</label>
          <select
            id="my-team"
            value={myTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            style={{ minWidth: 180 }}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionError && <div className="alert error">{actionError}</div>}
      {teams.length === 0 && (
        <div className="alert info">
          Nessuna squadra in questa lega:{" "}
          <Link to={`/leagues/${leagueId}`}>aggiungine almeno una</Link>.
        </div>
      )}

      {/* Riepilogo della mia situazione */}
      {myBudget && (
        <div className="tiles">
          <div className="tile">
            <span>Budget residuo</span>
            <b className="accent">{myBudget.remaining}</b>
          </div>
          <div className="tile">
            <span>Rosa</span>
            <b>
              {myBudget.playersOwned}/{budget.slots.total}
            </b>
          </div>
          {ROLES.map((r) => (
            <div className="tile" key={r}>
              <span>{r}</span>
              <b>
                {myBudget.countByRole[r]}/{budget.slots[r]}
              </b>
            </div>
          ))}
        </div>
      )}

      {/* Giocatore attualmente all'asta */}
      <div className="card auction-live">
        <div className="spread" style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>Chiamata in corso</h2>
          <div className="row" style={{ gap: "0.5rem" }}>
            {syncOn && liveFresh && (
              <span className="live-dot" title="Dati dalla lettura automatica">
                ● in diretta
              </span>
            )}
            {syncOn && !liveFresh && (
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                {live?.active
                  ? `ultima lettura ${live.ageSeconds}s fa`
                  : "nessuna lettura ricevuta"}
              </span>
            )}
            <button
              className={syncOn ? "sm" : "ghost sm"}
              onClick={() => setSyncOn((v) => !v)}
              title="Compila i campi automaticamente da quanto letto sulla pagina d'asta"
            >
              {syncOn ? "Sincronizzato" : "Manuale"}
            </button>
          </div>
        </div>
        <div className="field-row">
          <div style={{ gridColumn: "span 2" }}>
            <label htmlFor="call-name">Giocatore chiamato</label>
            <input
              id="call-name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Scrivi il nome…"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="call-bid">Offerta corrente</label>
            <div className="row" style={{ flexWrap: "nowrap", gap: "0.35rem" }}>
              <button
                type="button"
                className="sm"
                onClick={() => setBid((b) => Math.max(1, b - 1))}
              >
                −
              </button>
              <input
                id="call-bid"
                type="number"
                min={1}
                value={bid}
                onChange={(e) => setBid(Math.max(1, Number(e.target.value)))}
                style={{ textAlign: "center" }}
              />
              <button type="button" className="sm" onClick={() => setBid((b) => b + 1)}>
                +
              </button>
              <button type="button" className="sm" onClick={() => setBid((b) => b + 5)}>
                +5
              </button>
            </div>
          </div>
        </div>

        {!playerName.trim() && (
          <div className="alert info">
            Scrivi il nome del giocatore chiamato per vedere il consiglio.
          </div>
        )}

        {evaluation && !evaluation.matched && (
          <div className="alert info">
            <strong>{evaluation.query}</strong> non riconosciuto fra i
            disponibili: potrebbe essere già stato preso o non essere nel
            listone.
          </div>
        )}

        {evaluation?.matched && evaluation.player && (
          <>
            <div className="row" style={{ marginBottom: "0.75rem" }}>
              <span className={`badge ${evaluation.player.role}`}>
                {evaluation.player.role}
              </span>
              <strong style={{ fontSize: "1.1rem" }}>
                {evaluation.player.name}
              </strong>
              <span className="muted">{evaluation.player.realTeam}</span>
              {evaluation.confidence !== undefined &&
                evaluation.confidence < 0.9 && (
                  <span className="muted" style={{ fontSize: "0.78rem" }}>
                    (corrispondenza {Math.round(evaluation.confidence * 100)}%)
                  </span>
                )}
            </div>

            <div className={`verdict ${VERDICT_CLASS[verdict ?? ""] ?? "warn"}`}>
              {VERDICT_LABEL[verdict ?? ""] ?? "—"}
            </div>

            <div className="tiles" style={{ marginTop: "0.75rem" }}>
              <div className="tile">
                <span>Offerta</span>
                <b className={overThreshold ? "danger-text" : undefined}>{bid}</b>
              </div>
              <div className="tile">
                <span>Soglia max</span>
                <b className="accent">{evaluation.maxBid}</b>
              </div>
              <div className="tile">
                <span>Valore</span>
                <b>{evaluation.fairValue}</b>
              </div>
            </div>

            <p style={{ marginBottom: "0.35rem" }}>{evaluation.advice}</p>
            <p className="muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
              {evaluation.reason}
            </p>

            <div className="row">
              <span className="muted">Aggiudicato a:</span>
              {teams.map((t) => (
                <button
                  key={t.id}
                  className={t.id === myTeamId ? "primary sm" : "sm"}
                  disabled={assigning}
                  onClick={() => award(t.id)}
                  title={`Assegna ${evaluation.player?.name} a ${t.name} per ${bid}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Chi conviene chiamare */}
      <div className="section-title">
        <h2>Chi chiamare adesso</h2>
      </div>
      {!recs || recs.suggestions.length === 0 ? (
        <div className="alert info">
          Nessun consiglio disponibile: serve un listone importato e slot ancora
          da riempire.
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Ruolo</th>
                <th>Giocatore</th>
                <th>Squadra</th>
                <th>Valore</th>
                <th>Soglia max</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recs.suggestions.map((s, i) => (
                <tr key={s.playerId}>
                  <td className="muted">{i + 1}</td>
                  <td>
                    <span className={`badge ${s.role}`}>{s.role}</span>
                  </td>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td className="muted">{s.realTeam}</td>
                  <td>{s.fairValue}</td>
                  <td className="accent">
                    <strong>{s.maxBid}</strong>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="sm"
                      onClick={() => pickSuggestion(s.name, 1)}
                    >
                      Chiama
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Budget di tutte le squadre */}
      <div className="section-title">
        <h2>Budget avversari</h2>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Squadra</th>
              <th>Residuo</th>
              <th>Rosa</th>
              {ROLES.map((r) => (
                <th key={r} title={ROLE_LABELS[r]}>
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {budget.teams.map((t) => (
              <tr key={t.teamId}>
                <td>
                  {t.teamName}
                  {t.teamId === myTeamId && <span className="muted"> (tu)</span>}
                </td>
                <td>
                  <strong className="accent">{t.remaining}</strong>
                </td>
                <td>
                  {t.playersOwned}/{budget.slots.total}
                </td>
                {ROLES.map((r) => (
                  <td key={r}>
                    {t.countByRole[r]}/{budget.slots[r]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
