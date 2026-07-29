import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, ApiError } from "../lib/api";
import { useLoad } from "../lib/useLoad";
import { MEMBER_ROLE_LABELS } from "../lib/util";

export function InvitePage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const loader = useCallback(() => api.getInvitationPreview(token), [token]);
  const { data, error, loading } = useLoad(loader);

  const [busy, setBusy] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setAcceptError(null);
    try {
      const org = await api.acceptInvitation(token);
      navigate(`/organizations/${org.id}`);
    } catch (err) {
      setAcceptError(err instanceof ApiError ? err.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>Invito</h1>
        {loading && <p className="muted">Caricamento invito…</p>}
        {error && (
          <>
            <div className="alert error">{error}</div>
            <p className="center-note">
              <Link to="/">Torna alla home</Link>
            </p>
          </>
        )}
        {data && !data.valid && (
          <>
            <div className="alert error">
              Questo invito non è più valido (scaduto o già utilizzato).
            </div>
            <p className="center-note">
              <Link to="/">Torna alla home</Link>
            </p>
          </>
        )}
        {data && data.valid && (
          <>
            <p>
              Sei stato invitato a unirti a{" "}
              <strong>{data.organizationName}</strong> come{" "}
              <strong>{MEMBER_ROLE_LABELS[data.role]}</strong>.
            </p>
            {acceptError && <div className="alert error">{acceptError}</div>}
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <button className="primary" onClick={accept} disabled={busy}>
                {busy ? "Accettazione…" : "Accetta invito"}
              </button>
              <Link to="/">
                <button className="ghost">Annulla</button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
