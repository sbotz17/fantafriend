import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/context";
import { ApiError } from "../lib/api";

export function RegisterPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup(email, name, password);
      navigate("/");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Registrazione non riuscita",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>Crea un account</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Inizia a gestire le tue aste di fantacalcio.
        </p>
        <form onSubmit={onSubmit} style={{ marginTop: "1rem" }}>
          {error && (
            <div className="alert error" style={{ marginBottom: "0.85rem" }}>
              {error}
            </div>
          )}
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
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
              minLength={8}
              autoComplete="new-password"
            />
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              Almeno 8 caratteri.
            </span>
          </div>
          <button className="primary" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Creazione…" : "Registrati"}
          </button>
        </form>
        <p className="center-note muted">
          Hai già un account? <Link to="/login">Accedi</Link>
        </p>
      </div>
    </div>
  );
}
