import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/context";
import { ApiError } from "../lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Accesso non riuscito");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>
          Fanta<span style={{ color: "var(--primary)" }}>Friend</span>
        </h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Accedi al tuo assistente d'asta.
        </p>
        <form onSubmit={onSubmit} style={{ marginTop: "1rem" }}>
          {error && (
            <div className="alert error" style={{ marginBottom: "0.85rem" }}>
              {error}
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button className="primary" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Accesso…" : "Accedi"}
          </button>
        </form>
        <p className="center-note muted">
          Non hai un account? <Link to="/register">Registrati</Link>
        </p>
      </div>
    </div>
  );
}
