// Associazione fra il nome letto dalla pagina di Fantalab e un giocatore del
// listone. I nomi non coincidono mai esattamente: cambiano maiuscole, accenti,
// ordine, e spesso compare il solo cognome. Queste funzioni sono pure e
// testabili.

/** Minuscole, senza accenti, senza punteggiatura, spazi normalizzati. */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distanza di Levenshtein (numero minimo di modifiche fra due stringhe). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Somiglianza fra 0 (diversi) e 1 (identici). */
export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(a, b) / longest;
}

export interface Candidate {
  id: string;
  name: string;
  realTeam: string;
}

export interface MatchResult<T extends Candidate> {
  player: T;
  /** Confidenza da 0 a 1. */
  confidence: number;
}

/**
 * Trova il giocatore del listone che meglio corrisponde al testo letto.
 *
 * Strategia, dalla più affidabile alla più tollerante:
 *  1. corrispondenza esatta sul nome normalizzato;
 *  2. tutti i token cercati presenti nel nome (es. "lautaro" in
 *     "lautaro martinez"), utile quando Fantalab mostra il solo cognome;
 *  3. somiglianza testuale, per refusi e nomi troncati.
 *
 * `realTeam`, se fornita, fa da conferma: a parità di somiglianza vince il
 * giocatore della squadra giusta, il che risolve i casi di omonimia.
 */
export function matchPlayer<T extends Candidate>(
  query: string,
  candidates: T[],
  realTeam?: string,
): MatchResult<T> | null {
  const q = normalizeName(query);
  if (!q || candidates.length === 0) return null;

  const qTokens = q.split(" ").filter((t) => t.length > 1);
  const team = realTeam ? normalizeName(realTeam) : null;

  let best: MatchResult<T> | null = null;

  for (const candidate of candidates) {
    const name = normalizeName(candidate.name);
    let score: number;

    if (name === q) {
      score = 1;
    } else {
      const nameTokens = name.split(" ").filter((t) => t.length > 1);
      const allPresent =
        qTokens.length > 0 &&
        qTokens.every((t) => nameTokens.some((n) => n === t));
      if (allPresent) {
        // Match per token: più token coincidono sul totale, più è affidabile.
        score = 0.9 * (qTokens.length / Math.max(nameTokens.length, 1));
        score = Math.max(0.75, score);
      } else {
        // Confronto sul nome completo e, in parallelo, sul singolo token più
        // somigliante: Fantalab mostra spesso il solo cognome, a volte con
        // refusi ("Barela" per "Barella").
        const whole = similarity(q, name);
        let bestToken = 0;
        for (const qt of qTokens.length > 0 ? qTokens : [q]) {
          for (const nt of nameTokens) {
            const s = similarity(qt, nt);
            if (s > bestToken) bestToken = s;
          }
        }
        // Il match su un solo token vale un po' meno di quello sul nome intero.
        score = Math.max(whole, bestToken * 0.95);
      }
    }

    // La squadra reale corretta conferma il match; quella sbagliata lo indebolisce.
    if (team) {
      const candidateTeam = normalizeName(candidate.realTeam);
      if (candidateTeam === team) score = Math.min(1, score + 0.1);
      else score -= 0.05;
    }

    if (!best || score > best.confidence) {
      best = { player: candidate, confidence: Math.max(0, Math.min(1, score)) };
    }
  }

  // Sotto questa soglia il match è troppo incerto per fidarsi in un'asta.
  if (!best || best.confidence < 0.6) return null;
  return best;
}
