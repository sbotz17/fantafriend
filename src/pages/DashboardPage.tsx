import { useCallback, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/context";
import { api, ApiError } from "../lib/api";
import { useLoad } from "../lib/useLoad";
import { slugify } from "../lib/util";

export function DashboardPage() {
  const { user } = useAuth();
  const loader = useCallback(() => api.listOrganizations(), []);
  const { data: orgs, error, loading, reload } = useLoad(loader);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.createOrganization({ name, slug, ownerId: user.id });
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

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1>Le tue organizzazioni</h1>
          <p className="muted" style={{ margin: 0 }}>
            Un'organizzazione raggruppa le tue leghe di fantacalcio.
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Nuova organizzazione</h3>
        <form onSubmit={onCreate}>
          {formError && (
            <div className="alert error" style={{ marginBottom: "0.75rem" }}>
              {formError}
            </div>
          )}
          <div className="field-row">
            <div>
              <label htmlFor="org-name">Nome</label>
              <input
                id="org-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Amici del bar"
                required
              />
            </div>
            <div>
              <label htmlFor="org-slug">Slug</label>
              <input
                id="org-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEdited(true);
                }}
                placeholder="amici-del-bar"
                required
              />
            </div>
          </div>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Creazione…" : "Crea organizzazione"}
          </button>
        </form>
      </div>

      {loading && <div className="alert info">Caricamento…</div>}
      {error && <div className="alert error">{error}</div>}

      {orgs && orgs.length === 0 && (
        <div className="alert info">
          Nessuna organizzazione: creane una qui sopra per iniziare.
        </div>
      )}

      {orgs && orgs.length > 0 && (
        <div className="grid">
          {orgs.map((org) => (
            <Link key={org.id} to={`/organizations/${org.id}`} className="card">
              <h3>{org.name}</h3>
              <span className="muted">/{org.slug}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
