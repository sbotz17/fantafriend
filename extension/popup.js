// Configurazione dell'estensione: indirizzo di FantaFriend, lega e squadra, e
// avvio del selettore visuale sulla pagina d'asta.

const $ = (id) => document.getElementById(id);
const statusEl = $("status");

function setStatus(text, kind = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`;
}

function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Invia un messaggio allo script della pagina, iniettandolo se non è già
 * presente: così l'estensione funziona anche su URL diversi da fantalab.it.
 */
async function sendToPage(message) {
  const tab = await activeTab();
  if (!tab?.id) throw new Error("Nessuna scheda attiva");

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["content.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    return chrome.tabs.sendMessage(tab.id, message);
  }
}

// ------------------------------------------------------------- configurazione

async function loadLeagues() {
  setStatus("Carico le leghe…");
  const res = await send({ type: "listLeagues" });
  if (!res?.ok) {
    setStatus(res?.error || "Errore nel caricamento", "err");
    return;
  }
  const { leagueId } = await chrome.storage.local.get("leagueId");
  $("league").innerHTML =
    '<option value="">— scegli —</option>' +
    res.data
      .map(
        (l) =>
          `<option value="${l.id}"${l.id === leagueId ? " selected" : ""}>${l.name} (${l.season})</option>`,
      )
      .join("");
  setStatus(`${res.data.length} leghe disponibili`, "ok");
  if (leagueId) await loadTeams(leagueId);
}

async function loadTeams(leagueId) {
  if (!leagueId) return;
  const res = await send({ type: "listTeams", leagueId });
  if (!res?.ok) {
    setStatus(res?.error || "Errore nel caricamento squadre", "err");
    return;
  }
  const { fantasyTeamId } = await chrome.storage.local.get("fantasyTeamId");
  $("team").innerHTML =
    '<option value="">— scegli —</option>' +
    res.data
      .map(
        (t) =>
          `<option value="${t.id}"${t.id === fantasyTeamId ? " selected" : ""}>${t.name}</option>`,
      )
      .join("");
}

// ------------------------------------------------------------------- eventi

$("apiBase").addEventListener("change", async (e) => {
  await chrome.storage.local.set({ apiBase: e.target.value.trim() });
  loadLeagues();
});

$("league").addEventListener("change", async (e) => {
  await chrome.storage.local.set({ leagueId: e.target.value });
  await loadTeams(e.target.value);
});

$("team").addEventListener("change", async (e) => {
  await chrome.storage.local.set({ fantasyTeamId: e.target.value });
  await sendToPage({ type: "restart" }).catch(() => {});
  setStatus("Squadra impostata", "ok");
});

$("reload").addEventListener("click", loadLeagues);

for (const [id, target] of [
  ["pickPlayer", "player"],
  ["pickBid", "bid"],
]) {
  $(id).addEventListener("click", async () => {
    try {
      await sendToPage({ type: "pick", target });
      window.close(); // il popup deve chiudersi per poter cliccare sulla pagina
    } catch (err) {
      setStatus(`Impossibile attivare la selezione: ${err.message}`, "err");
    }
  });
}

// --------------------------------------------------------------------- avvio

(async () => {
  const stored = await chrome.storage.local.get([
    "apiBase",
    "playerSelector",
    "bidSelector",
  ]);
  $("apiBase").value = stored.apiBase || "https://fantami.it";

  await loadLeagues();

  const configured = [
    stored.playerSelector ? "giocatore ✓" : "giocatore ✗",
    stored.bidSelector ? "offerta ✓" : "offerta ✗",
  ].join(" · ");
  if (statusEl.className.includes("err") === false) {
    setStatus(`Selettori: ${configured}`);
  }
})();
