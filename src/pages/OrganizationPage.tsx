import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError } from "../lib/api";
import { useLoad } from "../lib/useLoad";
import { slugify, STATUS_LABELS } from "../lib/util";

export function OrganizationPage() {
  const { orgId = "" } = useParams();
  const loader = useCallback(
    async () => ({
      org: await api.getOrganization(orgId),
      leagues: await api.listLeagues(orgId),
    }),
    [orgId],
  );
  const { data, error, loading, reload } = useLoad(loader);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [season, setSeason] = useState("2025-26");
  const [budget, setBudget] = useState(500);
  const [slots, setSlots] = useState({ P: 3, D: 8, C: 8, A: 6 });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await api.createLeague({
        organizationId: orgId,
        name,
        slug,
        season,
        budget,
        slotsGoalkeeper: slots.P,
        slotsDefender: slots.D,
        slotsMidfielder: slots.C,
        slotsForward: slots.A,
      });
      setName("");
      setSlug("");
      setSlugEdited(false);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="alert info">Caricamento…</div>;
  if (error) return <div className="alert error">{error}</div>;
  if (!data) return null;

  return (
    <div className="stack">
      <div className="breadcrumb">
        <Link to="/">Organizzazioni</Link> <span className="muted">/ {data.org.name}</span>
      </div>

      <div className="spread">
        <div>
          <h1>{data.org.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Leghe di questa organizzazione.
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Nuova lega</h3>
        <form onSubmit={onCreate}>
          {formError && (
            <div className="alert error" style={{ marginBottom: "0.75rem" }}>
              {formError}
            </div>
          )}
          <div className="field-row">
            <div>
              <label htmlFor="lg-name">Nome</label>
              <input
                id="lg-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Lega Serie A"
                required
              />
            </div>
            <div>
              <label htmlFor="lg-slug">Slug</label>
              <input
                id="lg-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEdited(true);
                }}
                required
              />
            </div>
            <div>
              <label htmlFor="lg-season">Stagione</label>
              <input
                id="lg-season"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="lg-budget">Budget</label>
              <input
                id="lg-budget"
                type="number"
                min={1}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <label style={{ marginTop: "0.5rem" }}>Slot rosa</label>
          <div className="field-row">
            {(["P", "D", "C", "A"] as const).map((r) => (
              <div key={r}>
                <label htmlFor={`slot-${r}`}>
                  <span className={`badge ${r}`}>{r}</span>
                </label>
                <input
                  id={`slot-${r}`}
                  type="number"
                  min={0}
                  value={slots[r]}
                  onChange={(e) =>
                    setSlots((s) => ({ ...s, [r]: Number(e.target.value) }))
                  }
                  required
                />
              </div>
            ))}
          </div>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Creazione…" : "Crea lega"}
          </button>
        </form>
      </div>

      {data.leagues.length === 0 ? (
        <div className="alert info">Nessuna lega: creane una qui sopra.</div>
      ) : (
        <div className="grid">
          {data.leagues.map((lg) => (
            <Link key={lg.id} to={`/leagues/${lg.id}`} className="card">
              <div className="spread">
                <h3>{lg.name}</h3>
                <span className={`badge status-${lg.status}`}>
                  {STATUS_LABELS[lg.status]}
                </span>
              </div>
              <span className="muted">
                {lg.season} · {lg.budget} crediti
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
