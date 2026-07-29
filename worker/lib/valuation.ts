// Motore di valutazione per l'asta: calcola quanto vale davvero un giocatore
// per una squadra specifica, in un preciso momento dell'asta.
//
// Tutte le funzioni qui sono PURE (nessun accesso al database): ricevono lo
// stato e restituiscono numeri. Questo le rende testabili e prevedibili, cosa
// essenziale per uno strumento che deve dare consigli durante un'asta dal vivo.

/** Le quotazioni e gli FVM del listone ufficiale sono su base 500 crediti. */
export const BASELINE_BUDGET = 500;

export type Role = "P" | "D" | "C" | "A";

export interface ValuedPlayer {
  id: string;
  name: string;
  realTeam: string;
  role: Role;
  baseQuotation: number;
  fvm: number | null;
  fantamedia: number | null;
}

export interface TeamState {
  /** Crediti ancora disponibili. */
  remaining: number;
  /** Quanti giocatori possiede già, per ruolo. */
  ownedByRole: Record<Role, number>;
}

export interface LeagueConfig {
  budget: number;
  slots: Record<Role, number>;
}

/** Slot ancora da riempire per ciascun ruolo. */
export function missingByRole(
  league: LeagueConfig,
  team: TeamState,
): Record<Role, number> {
  return {
    P: Math.max(0, league.slots.P - team.ownedByRole.P),
    D: Math.max(0, league.slots.D - team.ownedByRole.D),
    C: Math.max(0, league.slots.C - team.ownedByRole.C),
    A: Math.max(0, league.slots.A - team.ownedByRole.A),
  };
}

/** Totale degli slot ancora da riempire. */
export function totalMissing(missing: Record<Role, number>): number {
  return missing.P + missing.D + missing.C + missing.A;
}

/**
 * Valore di mercato del giocatore riportato al budget di questa lega.
 * Preferisce l'FVM (più indicativo del prezzo reale d'asta); in mancanza usa
 * la quotazione base.
 */
export function fairValue(player: ValuedPlayer, league: LeagueConfig): number {
  const raw = player.fvm ?? player.baseQuotation;
  const scaled = (raw * league.budget) / BASELINE_BUDGET;
  return Math.max(1, Math.round(scaled));
}

/**
 * Tetto di spesa sostenibile: quanto la squadra può offrire al massimo
 * lasciando almeno 1 credito per ogni altro slot ancora da riempire.
 * È lo stesso vincolo applicato dall'API in fase di aggiudicazione.
 */
export function affordableCap(
  league: LeagueConfig,
  team: TeamState,
): number {
  const missing = totalMissing(missingByRole(league, team));
  if (missing <= 0) return 0;
  // Comprando questo giocatore restano (missing - 1) slot da coprire.
  return team.remaining - (missing - 1);
}

/**
 * Indice di scarsità del ruolo (0 = abbondanza, 1 = massima scarsità).
 * Se restano pochi giocatori disponibili rispetto agli slot ancora da
 * riempire in quel ruolo, il prezzo di mercato tende a salire.
 */
export function scarcity(
  availableInRole: number,
  missingInRole: number,
): number {
  if (missingInRole <= 0) return 0;
  if (availableInRole <= missingInRole) return 1;
  const ratio = missingInRole / availableInRole;
  return Math.min(1, Math.max(0, ratio));
}

export interface Threshold {
  /** Valore equo del giocatore in questa lega. */
  fair: number;
  /** Massimo che ha senso offrire (valore equo + premio di scarsità). */
  max: number;
  /** Tetto imposto dal budget: oltre non si può proprio andare. */
  cap: number;
  /** Motivo in italiano, da mostrare in interfaccia. */
  reason: string;
}

/**
 * Soglia massima di chiamata per un giocatore, per una squadra specifica.
 *
 * Combina tre limiti:
 *  1. il valore equo del giocatore (FVM scalato al budget della lega);
 *  2. un premio fino al +35% se il ruolo è scarso e la squadra ne ha bisogno;
 *  3. il tetto di sostenibilità del budget, che vince sempre sugli altri.
 */
export function maxBid(
  player: ValuedPlayer,
  league: LeagueConfig,
  team: TeamState,
  availableInRole: number,
): Threshold {
  const fair = fairValue(player, league);
  const missing = missingByRole(league, team);
  const missingInRole = missing[player.role];
  const cap = affordableCap(league, team);

  if (missingInRole <= 0) {
    return {
      fair,
      max: 0,
      cap,
      reason: `Reparto ${player.role} già completo: non serve.`,
    };
  }

  const s = scarcity(availableInRole, missingInRole);
  const withScarcity = Math.round(fair * (1 + 0.35 * s));
  const max = Math.max(0, Math.min(withScarcity, cap));

  let reason: string;
  if (max <= 0) {
    reason = "Budget esaurito per questo acquisto.";
  } else if (cap < withScarcity) {
    reason = `Limitato dal budget: puoi arrivare a ${cap} lasciando 1 credito per ogni altro slot.`;
  } else if (s >= 0.6) {
    reason = `Ruolo ${player.role} scarso (${availableInRole} disponibili per ${missingInRole} slot): vale un sovrapprezzo.`;
  } else {
    reason = `Valore di mercato ${fair} nella tua lega.`;
  }

  return { fair, max, cap, reason };
}

export type Verdict = "conviene" | "limite" | "lascia" | "non_serve";

export interface Evaluation extends Threshold {
  verdict: Verdict;
  /** Offerta corrente valutata (se fornita). */
  currentBid: number | null;
  /** Frase pronta da mostrare durante l'asta. */
  advice: string;
}

/**
 * Valuta l'offerta corrente su un giocatore e produce il verdetto immediato:
 * rilanciare, essere al limite, o lasciar perdere.
 */
export function evaluateBid(
  player: ValuedPlayer,
  league: LeagueConfig,
  team: TeamState,
  availableInRole: number,
  currentBid: number | null,
): Evaluation {
  const t = maxBid(player, league, team, availableInRole);
  const missing = missingByRole(league, team);

  if (missing[player.role] <= 0) {
    return {
      ...t,
      verdict: "non_serve",
      currentBid,
      advice: `Non ti serve: reparto ${player.role} completo.`,
    };
  }
  if (t.max <= 0) {
    return {
      ...t,
      verdict: "lascia",
      currentBid,
      advice: "Budget insufficiente: lascia.",
    };
  }
  if (currentBid === null) {
    return {
      ...t,
      verdict: "conviene",
      currentBid,
      advice: `Puoi spingerti fino a ${t.max}.`,
    };
  }

  const next = currentBid + 1;
  if (next > t.max) {
    return {
      ...t,
      verdict: "lascia",
      currentBid,
      advice: `Lascia: oltre ${t.max} paghi troppo.`,
    };
  }
  // Entro il 15% dalla soglia: siamo al limite, rilanciare è ancora sensato
  // ma senza margine.
  if (next >= t.max * 0.85) {
    return {
      ...t,
      verdict: "limite",
      currentBid,
      advice: `Sei al limite: puoi arrivare a ${t.max}, non oltre.`,
    };
  }
  return {
    ...t,
    verdict: "conviene",
    currentBid,
    advice: `Rilancia: conviene fino a ${t.max}.`,
  };
}

export interface Suggestion {
  player: ValuedPlayer;
  threshold: Threshold;
  /** Punteggio di priorità: più alto = da chiamare prima. */
  score: number;
}

/**
 * Ordina i giocatori disponibili per priorità di chiamata, considerando i
 * ruoli che mancano alla squadra, il valore dei giocatori e la scarsità.
 * Restituisce solo giocatori che la squadra può effettivamente permettersi.
 */
export function suggestCalls(
  available: ValuedPlayer[],
  league: LeagueConfig,
  team: TeamState,
  limit = 10,
): Suggestion[] {
  const missing = missingByRole(league, team);
  const countByRole: Record<Role, number> = { P: 0, D: 0, C: 0, A: 0 };
  for (const p of available) countByRole[p.role] += 1;

  const suggestions: Suggestion[] = [];
  for (const player of available) {
    if (missing[player.role] <= 0) continue;

    const threshold = maxBid(player, league, team, countByRole[player.role]);
    if (threshold.max <= 0) continue;

    const s = scarcity(countByRole[player.role], missing[player.role]);
    // Priorità: valore del giocatore, amplificato dalla scarsità del ruolo e
    // dal numero di slot ancora scoperti in quel reparto.
    const urgency = 1 + s + missing[player.role] / (league.slots[player.role] || 1);
    suggestions.push({
      player,
      threshold,
      score: Math.round(threshold.fair * urgency * 100) / 100,
    });
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
}
