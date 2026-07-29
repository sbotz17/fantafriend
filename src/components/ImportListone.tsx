import { useMemo, useState } from "react";

import { api, ApiError } from "../lib/api";
import { LISTONE_TEMPLATE, parseListone } from "../lib/csv";

interface Props {
  season: string;
  onImported: () => void;
}

export function ImportListone({ season, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const parsed = useMemo(
    () => (text.trim() ? parseListone(text) : null),
    [text],
  );

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setText(await file.text());
    setResult(null);
  };

  const onImport = async () => {
    if (!parsed || parsed.players.length === 0) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.bulkCreatePlayers(
        parsed.players.map((p) => ({ ...p, season })),
      );
      const skipped = res.requested - res.inserted;
      setResult(
        `Importati ${res.inserted} giocatori` +
          (skipped > 0 ? ` (${skipped} già presenti, ignorati).` : "."),
      );
      setText("");
      onImported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore durante l'import");
    } finally {
      setBusy(false);
    }
  };

  const templateHref =
    "data:text/csv;charset=utf-8," + encodeURIComponent(LISTONE_TEMPLATE);

  if (!open) {
    return (
      <button className="ghost sm" onClick={() => setOpen(true)}>
        Importa da CSV
      </button>
    );
  }

  return (
    <div className="stack" style={{ gap: "0.75rem" }}>
      <div className="spread">
        <strong>Importa listone da CSV</strong>
        <button className="ghost sm" onClick={() => setOpen(false)}>
          Chiudi
        </button>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
        Intestazione richiesta: <code>nome</code>, <code>squadra</code>,{" "}
        <code>ruolo</code> (P/D/C/A); <code>quotazione</code> opzionale.
        Delimitatore <code>,</code> <code>;</code> o tab. Stagione: {season}.{" "}
        <a href={templateHref} download={`listone-${season}.csv`}>
          Scarica modello
        </a>
      </p>

      <input
        type="file"
        accept=".csv,text/csv,text/plain"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
        placeholder={"Ruolo,Nome,Squadra,Quotazione\nA,Lautaro Martinez,Inter,32"}
        rows={6}
        style={{
          width: "100%",
          fontFamily: "monospace",
          fontSize: "0.85rem",
          background: "var(--surface-2)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "0.6rem",
        }}
      />

      {parsed && (
        <div className="alert info">
          {parsed.players.length} giocatori validi su {parsed.totalRows} righe.
          {parsed.errors.length > 0 && (
            <>
              <br />
              <span style={{ color: "var(--warning)" }}>
                {parsed.errors.length} righe con problemi:
              </span>
              <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem" }}>
                {parsed.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {parsed.errors.length > 5 && (
                  <li>…e altri {parsed.errors.length - 5}.</li>
                )}
              </ul>
            </>
          )}
        </div>
      )}

      {error && <div className="alert error">{error}</div>}
      {result && (
        <div className="alert info" style={{ color: "var(--primary)" }}>
          {result}
        </div>
      )}

      <div>
        <button
          className="primary"
          onClick={onImport}
          disabled={busy || !parsed || parsed.players.length === 0}
        >
          {busy
            ? "Importazione…"
            : `Importa ${parsed?.players.length ?? 0} giocatori`}
        </button>
      </div>
    </div>
  );
}
