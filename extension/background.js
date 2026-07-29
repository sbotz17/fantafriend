// Service worker dell'estensione: unico punto che parla con l'API FantaFriend.
//
// Le chiamate partono da qui (e non dallo script iniettato) per due motivi:
// il service worker ha i permessi host dichiarati nel manifest, quindi non
// incontra i blocchi CORS della pagina ospite, e il cookie di sessione di
// FantaFriend viene inviato correttamente.

const DEFAULTS = { apiBase: "https://fantami.it" };

async function getConfig() {
  const stored = await chrome.storage.local.get([
    "apiBase",
    "leagueId",
    "fantasyTeamId",
  ]);
  return { ...DEFAULTS, ...stored };
}

/** Chiede a FantaFriend il verdetto sul giocatore attualmente all'asta. */
async function evaluate({ playerName, currentBid }) {
  const { apiBase, leagueId, fantasyTeamId } = await getConfig();

  if (!leagueId || !fantasyTeamId) {
    return { error: "Configura lega e squadra nel popup dell'estensione." };
  }

  const url = `${apiBase.replace(/\/$/, "")}/api/leagues/${leagueId}/evaluate`;

  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fantasyTeamId, playerName, currentBid }),
    });

    if (res.status === 401) {
      return { error: `Non autenticato: apri ${apiBase} e accedi.` };
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { error: body?.error || `Errore ${res.status}` };
    }
    return await res.json();
  } catch (err) {
    return { error: `Impossibile contattare ${apiBase}: ${err.message}` };
  }
}

/** Elenco delle leghe dell'utente, per popolare il popup. */
async function fetchJson(path) {
  const { apiBase } = await getConfig();
  const res = await fetch(`${apiBase.replace(/\/$/, "")}${path}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(res.status === 401 ? "Non autenticato" : `Errore ${res.status}`);
  return res.json();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "evaluate") {
    evaluate(msg).then(sendResponse);
    return true; // risposta asincrona
  }
  if (msg.type === "listLeagues") {
    fetchJson("/api/leagues")
      .then((data) => sendResponse({ ok: true, data }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "listTeams") {
    fetchJson(`/api/leagues/${msg.leagueId}/teams`)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  return false;
});
