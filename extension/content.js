// Script iniettato nella pagina d'asta. Fa tre cose:
//  1. permette di indicare con un clic dove si trovano il nome del giocatore e
//     l'offerta corrente (selettore visuale);
//  2. osserva quegli elementi e reagisce a ogni cambiamento;
//  3. mostra un pannello fluttuante con il verdetto ricevuto da FantaFriend.
//
// Non conosciamo la struttura HTML della pagina: per questo i selettori non
// sono scritti a mano ma imparati dai clic dell'utente. Se il sito cambia
// layout basta rifare la selezione.

(() => {
  if (window.__fantafriendLoaded) return;
  window.__fantafriendLoaded = true;

  let config = { playerSelector: null, bidSelector: null };
  let observer = null;
  let lastSent = "";
  let pickerMode = null; // 'player' | 'bid' | null

  // ---------------------------------------------------------------- selettori

  /**
   * Costruisce un selettore CSS stabile per l'elemento indicato.
   * Preferisce l'id; altrimenti risale il DOM usando tag, classi "sane" e
   * posizione fra i fratelli, fermandosi appena il selettore è univoco.
   */
  function buildSelector(el) {
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
      return `#${CSS.escape(el.id)}`;
    }

    const parts = [];
    let node = el;

    while (node && node.nodeType === 1 && node !== document.body) {
      let part = node.tagName.toLowerCase();

      // Le classi generate dinamicamente (hash) cambiano a ogni build: teniamo
      // solo quelle leggibili, che di solito sono stabili.
      const stable = Array.from(node.classList).filter(
        (c) => c.length > 1 && c.length < 30 && !/\d{4,}/.test(c),
      );
      if (stable.length > 0) {
        part += "." + stable.slice(0, 2).map((c) => CSS.escape(c)).join(".");
      }

      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (s) => s.tagName === node.tagName,
        );
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
      }

      parts.unshift(part);
      const candidate = parts.join(" > ");
      try {
        if (document.querySelectorAll(candidate).length === 1) return candidate;
      } catch {
        // Selettore non valido: proseguiamo risalendo.
      }
      node = parent;
    }

    return parts.join(" > ");
  }

  // ------------------------------------------------------------------ lettura

  function readText(selector) {
    if (!selector) return null;
    try {
      const el = document.querySelector(selector);
      return el ? el.textContent.trim().replace(/\s+/g, " ") : null;
    } catch {
      return null;
    }
  }

  /** Estrae il primo numero intero presente nel testo (es. "32 crediti" -> 32). */
  function parseBid(text) {
    if (!text) return null;
    const m = text.replace(/\./g, "").match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  }

  // ------------------------------------------------------------------ pannello

  function ensurePanel() {
    let panel = document.getElementById("fantafriend-panel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "fantafriend-panel";
    panel.innerHTML = `
      <div class="ff-head">
        <span class="ff-logo">Fanta<b>Friend</b></span>
        <button class="ff-close" title="Nascondi">×</button>
      </div>
      <div class="ff-body"><div class="ff-idle">In attesa dell'asta…</div></div>
    `;
    document.body.appendChild(panel);
    panel.querySelector(".ff-close").addEventListener("click", () => {
      panel.style.display = "none";
    });
    return panel;
  }

  function renderVerdict(data) {
    const panel = ensurePanel();
    panel.style.display = "block";
    const body = panel.querySelector(".ff-body");

    if (data.error) {
      body.innerHTML = `<div class="ff-error">${escapeHtml(data.error)}</div>`;
      return;
    }
    if (!data.matched) {
      body.innerHTML = `
        <div class="ff-unknown">
          <div class="ff-name">${escapeHtml(data.query || "?")}</div>
          <div class="ff-note">Non riconosciuto nel listone (o già preso).</div>
        </div>`;
      return;
    }

    const cls =
      { conviene: "ok", limite: "warn", lascia: "no", non_serve: "no" }[
        data.verdict
      ] || "warn";
    const label =
      {
        conviene: "RILANCIA",
        limite: "AL LIMITE",
        lascia: "LASCIA",
        non_serve: "NON SERVE",
      }[data.verdict] || "—";

    body.innerHTML = `
      <div class="ff-player">
        <span class="ff-role ff-role-${escapeHtml(data.player.role)}">${escapeHtml(data.player.role)}</span>
        <span class="ff-name">${escapeHtml(data.player.name)}</span>
        <span class="ff-team">${escapeHtml(data.player.realTeam)}</span>
      </div>
      <div class="ff-verdict ff-${cls}">${label}</div>
      <div class="ff-numbers">
        <div><span>Offerta</span><b>${data.currentBid ?? "—"}</b></div>
        <div><span>Soglia max</span><b class="ff-max">${data.maxBid}</b></div>
        <div><span>Valore</span><b>${data.fairValue}</b></div>
      </div>
      <div class="ff-advice">${escapeHtml(data.advice)}</div>
      <div class="ff-note">Budget residuo: ${data.budgetRemaining}</div>
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  }

  // ------------------------------------------------------------- invio all'API

  function pushState() {
    const playerName = readText(config.playerSelector);
    if (!playerName) return;

    const currentBid = parseBid(readText(config.bidSelector));
    const key = `${playerName}|${currentBid}`;
    if (key === lastSent) return; // niente di cambiato
    lastSent = key;

    chrome.runtime.sendMessage(
      { type: "evaluate", playerName, currentBid },
      (response) => {
        if (chrome.runtime.lastError) {
          renderVerdict({ error: chrome.runtime.lastError.message });
          return;
        }
        renderVerdict(response || { error: "Nessuna risposta" });
      },
    );
  }

  function startWatching() {
    if (observer) observer.disconnect();
    if (!config.playerSelector) return;

    observer = new MutationObserver(() => pushState());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    ensurePanel();
    pushState();
  }

  // ---------------------------------------------------------------- selettore

  function highlight(el) {
    document
      .querySelectorAll(".ff-pick-hover")
      .forEach((n) => n.classList.remove("ff-pick-hover"));
    if (el) el.classList.add("ff-pick-hover");
  }

  function onPickMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && !el.closest("#fantafriend-panel")) highlight(el);
  }

  function onPickClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.closest("#fantafriend-panel")) return;

    const selector = buildSelector(el);
    const key = pickerMode === "player" ? "playerSelector" : "bidSelector";
    config[key] = selector;
    chrome.storage.local.set({ [key]: selector });

    stopPicker();
    lastSent = "";
    startWatching();
  }

  function startPicker(mode) {
    pickerMode = mode;
    document.body.classList.add("ff-picking");
    document.addEventListener("mousemove", onPickMove, true);
    document.addEventListener("click", onPickClick, true);

    const hint = document.createElement("div");
    hint.id = "ff-hint";
    hint.textContent =
      mode === "player"
        ? "Clicca sul NOME del giocatore all'asta (Esc per annullare)"
        : "Clicca sull'OFFERTA corrente (Esc per annullare)";
    document.body.appendChild(hint);

    document.addEventListener("keydown", onPickKey, true);
  }

  function onPickKey(e) {
    if (e.key === "Escape") stopPicker();
  }

  function stopPicker() {
    pickerMode = null;
    document.body.classList.remove("ff-picking");
    document.removeEventListener("mousemove", onPickMove, true);
    document.removeEventListener("click", onPickClick, true);
    document.removeEventListener("keydown", onPickKey, true);
    highlight(null);
    document.getElementById("ff-hint")?.remove();
  }

  // ------------------------------------------------------------------ messaggi

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "pick") {
      startPicker(msg.target);
      sendResponse({ ok: true });
    } else if (msg.type === "status") {
      sendResponse({
        playerSelector: config.playerSelector,
        bidSelector: config.bidSelector,
        preview: {
          player: readText(config.playerSelector),
          bid: readText(config.bidSelector),
        },
      });
    } else if (msg.type === "restart") {
      lastSent = "";
      startWatching();
      sendResponse({ ok: true });
    }
    return true;
  });

  chrome.storage.local.get(["playerSelector", "bidSelector"], (stored) => {
    config.playerSelector = stored.playerSelector || null;
    config.bidSelector = stored.bidSelector || null;
    if (config.playerSelector) startWatching();
  });
})();
