import { useState } from "react";

import { api, ApiError } from "../lib/api";
import type { Invitation, Member, MemberRole } from "../lib/api";
import { MEMBER_ROLE_LABELS, ROLE_BADGE } from "../lib/util";

interface Props {
  orgId: string;
  currentUserId: string;
  myRole: MemberRole | undefined;
  members: Member[];
  invitations: Invitation[];
  onChange: () => void;
}

export function MembersAndInvites({
  orgId,
  currentUserId,
  myRole,
  members,
  invitations,
  onChange,
}: Props) {
  const isAdmin = myRole === "owner" || myRole === "admin";

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore");
    }
  };

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInviteLink(null);
    setCopied(false);
    try {
      const inv = await api.createInvitation(orgId, {
        email: inviteEmail.trim() || undefined,
        role: inviteRole,
      });
      setInviteLink(`${window.location.origin}/invite/${inv.token}`);
      setInviteEmail("");
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="stack">
      {error && <div className="alert error">{error}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Ruolo</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td>
                  {m.name}
                  {m.userId === currentUserId && (
                    <span className="muted"> (tu)</span>
                  )}
                </td>
                <td className="muted">{m.email}</td>
                <td>
                  {isAdmin && m.role !== "owner" ? (
                    <select
                      value={m.role}
                      onChange={(e) =>
                        run(() =>
                          api.updateMemberRole(
                            orgId,
                            m.userId,
                            e.target.value as "admin" | "member",
                          ),
                        )
                      }
                      style={{ maxWidth: 160 }}
                    >
                      <option value="member">Membro</option>
                      <option value="admin">Amministratore</option>
                    </select>
                  ) : (
                    <span className={`badge ${ROLE_BADGE[m.role]}`}>
                      {MEMBER_ROLE_LABELS[m.role]}
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td style={{ textAlign: "right" }}>
                    {m.role !== "owner" && (
                      <button
                        className="danger sm"
                        onClick={() =>
                          run(() => api.removeMember(orgId, m.userId))
                        }
                      >
                        Rimuovi
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <div className="card">
          <h3>Invita un membro</h3>
          <form onSubmit={createInvite}>
            <div className="field-row">
              <div>
                <label htmlFor="inv-email">Email (facoltativa)</label>
                <input
                  id="inv-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="amico@example.com"
                />
              </div>
              <div>
                <label htmlFor="inv-role">Ruolo</label>
                <select
                  id="inv-role"
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "admin" | "member")
                  }
                >
                  <option value="member">Membro</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>
            </div>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Creazione…" : "Genera invito"}
            </button>
          </form>

          {inviteLink && (
            <div className="alert info" style={{ marginTop: "0.85rem" }}>
              Condividi questo link con la persona da invitare (valido 14 giorni):
              <div className="row" style={{ marginTop: "0.5rem" }}>
                <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                <button className="sm" onClick={copyLink}>
                  {copied ? "Copiato!" : "Copia"}
                </button>
              </div>
            </div>
          )}

          {invitations.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h3>Inviti in sospeso</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Ruolo</th>
                      <th>Scadenza</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.email ?? <span className="muted">—</span>}</td>
                        <td>
                          <span className={`badge ${ROLE_BADGE[inv.role]}`}>
                            {MEMBER_ROLE_LABELS[inv.role]}
                          </span>
                        </td>
                        <td className="muted">
                          {new Date(inv.expiresAt).toLocaleDateString("it-IT")}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="danger sm"
                            onClick={() =>
                              run(() => api.revokeInvitation(inv.id))
                            }
                          >
                            Revoca
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
