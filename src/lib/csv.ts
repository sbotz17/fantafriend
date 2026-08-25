import type { Role, RosterEntry } from "./api";

export interface ParsedPlayer {
  name: string;
  realTeam: string;
  role: Role;
  baseQuotation: number;
  /** Fantavalore di Mercato: se presente guida i consigli d'asta. */
  fvm?: number;
  fantamedia?: number;
}

export interface ParseResult {
  players: ParsedPlayer[];
  errors: string[];
  totalRows: number;
  /** Quanti giocatori hanno l'FVM: senza, i consigli sono meno precisi. */
  withFvm: number;
}

type Field = keyof ParsedPlayer;

// Intestazioni riconosciute (in minuscolo). Coprono sia i nomi discorsivi sia
// le sigle del listone ufficiale di fantacalcio.it (R, Nome, Squadra, Qt.A, FVM).
const HEADER_ALIASES: Record<Field, string[]> = {
  name: ["nome", "name", "giocatore", "calciatore"],
  realTeam: ["squadra", "team", "club", "squadra reale"],
  role: ["ruolo", "r", "role"],
  baseQuotation: [
    "quotazione",
    "qt",
    "qt.a",
    "qta",
    "qt a",
    "quotazione attuale",
    "prezzo",
    "valore",
  ],
  fvm: ["fvm", "fvm m", "fantavalore", "fantavalore di mercato"],
  fantamedia: ["fantamedia", "fm", "fanta media", "media fanta"],
};

/**
 * Sceglie il delimitatore più probabile.
 *
 * Non basta guardare la prima riga: il listone ufficiale comincia con righe di
 * titolo prive di separatori, e un singolo carattere può comparire anche nei
 * dati (il ruolo Mantra "M;C" contiene un punto e virgola). Contiamo quindi le
 * occorrenze su un campione di righe e scegliamo il carattere nettamente più
 * frequente.
 */
function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).filter((l) => l.trim() !== "").slice(0, 20);

  const candidates: [string, RegExp][] = [
    ["\t", /\t/g],
    [";", /;/g],
    [",", /,/g],
  ];

  let best = ",";
  let max = -1;
  for (const [delim, re] of candidates) {
    const total = sample.reduce(
      (sum, line) => sum + (line.match(re) ?? []).length,
      0,
    );
    if (total > max) {
      max = total;
      best = delim;
    }
  }
  return best;
}

/** Parser CSV minimale con gestione delle virgolette doppie. */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else {
      field += ch;
    }
  }
  // Ultima riga senza newline finale.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function normalizeRole(value: string): Role | null {
  const c = value.trim().charAt(0).toUpperCase();
  return c === "P" || c === "D" || c === "C" || c === "A" ? c : null;
}

/** Mappa gli indici di colonna a partire dalla riga di intestazione. */
function mapHeaders(header: string[]): Partial<Record<Field, number>> {
  const normalized = header.map((h) =>
    String(h ?? "")
      .trim()
      .toLowerCase(),
  );
  const map: Partial<Record<Field, number>> = {};
  for (const field of Object.keys(HEADER_ALIASES) as Field[]) {
    const idx = normalized.findIndex((h) =>
      HEADER_ALIASES[field].includes(h),
    );
    if (idx !== -1) map[field] = idx;
  }
  return map;
}

/**
 * Individua la riga di intestazione. Il listone ufficiale è preceduto da una o
 * più righe di titolo (es. "Quotazioni Fantacalcio Stagione 2026-27"), quindi
 * non si può assumere che sia sempre la prima: cerchiamo entro le prime righe
 * quella che contiene davvero le colonne obbligatorie.
 */
function findHeaderRow(rows: string[][]): number {
  const limit = Math.min(rows.length, 15);
  for (let i = 0; i < limit; i++) {
    const cols = mapHeaders(rows[i]);
    if (
      cols.name !== undefined &&
      cols.realTeam !== undefined &&
      cols.role !== undefined
    ) {
      return i;
    }
  }
  return -1;
}

/** Legge un numero tollerando virgola decimale e spazi. */
function parseNumber(raw: string | undefined): number | null {
  const value = String(raw ?? "").trim().replace(",", ".");
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Analizza una tabella già suddivisa in righe e celle, qualunque sia
 * l'origine (CSV o foglio Excel). Servono le colonne nome, squadra e ruolo;
 * quotazione, FVM e fantamedia sono facoltative. La stagione arriva a parte,
 * dalla lega.
 */
export function parseRows(rows: string[][]): ParseResult {
  const empty = { players: [], errors: [] as string[], totalRows: 0, withFvm: 0 };

  if (rows.length < 2) {
    return {
      ...empty,
      errors: ["Servono un'intestazione e almeno una riga di dati."],
    };
  }

  const headerIndex = findHeaderRow(rows);
  if (headerIndex === -1) {
    const cols = mapHeaders(rows[0]);
    const missing: string[] = [];
    if (cols.name === undefined) missing.push("nome");
    if (cols.realTeam === undefined) missing.push("squadra");
    if (cols.role === undefined) missing.push("ruolo");
    return {
      ...empty,
      errors: [
        `Colonne mancanti nell'intestazione: ${missing.join(", ") || "nome, squadra, ruolo"}.`,
      ],
      totalRows: Math.max(0, rows.length - 1),
    };
  }

  const cols = mapHeaders(rows[headerIndex]);
  const players: ParsedPlayer[] = [];
  const errors: string[] = [];
  const dataRows = rows.slice(headerIndex + 1);
  let withFvm = 0;

  dataRows.forEach((row, index) => {
    const lineNo = headerIndex + index + 2; // numero di riga leggibile dall'utente
    const name = String(row[cols.name!] ?? "").trim();
    const realTeam = String(row[cols.realTeam!] ?? "").trim();
    const roleRaw = String(row[cols.role!] ?? "").trim();

    if (!name || !realTeam || !roleRaw) {
      errors.push(`Riga ${lineNo}: campi obbligatori mancanti.`);
      return;
    }
    const role = normalizeRole(roleRaw);
    if (!role) {
      errors.push(`Riga ${lineNo}: ruolo non valido "${roleRaw}" (usa P/D/C/A).`);
      return;
    }

    const player: ParsedPlayer = { name, realTeam, role, baseQuotation: 1 };

    if (cols.baseQuotation !== undefined) {
      const n = parseNumber(row[cols.baseQuotation]);
      if (n !== null && n >= 1) player.baseQuotation = Math.round(n);
    }
    if (cols.fvm !== undefined) {
      const n = parseNumber(row[cols.fvm]);
      if (n !== null && n >= 0) {
        player.fvm = Math.round(n);
        withFvm += 1;
      }
    }
    if (cols.fantamedia !== undefined) {
      const n = parseNumber(row[cols.fantamedia]);
      if (n !== null && n >= 0 && n <= 30) {
        player.fantamedia = Math.round(n * 100) / 100;
      }
    }

    players.push(player);
  });

  return { players, errors, totalRows: dataRows.length, withFvm };
}

/** Analizza il listone in formato CSV (o incollato come testo). */
export function parseListone(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { players: [], errors: ["File vuoto."], totalRows: 0, withFvm: 0 };
  }

  return parseRows(parseCsv(trimmed, detectDelimiter(trimmed)));
}

/**
 * Il listone ufficiale si scarica in formato Excel. Non usiamo una libreria per
 * leggerlo — l'unica pubblicata su npm è ferma a una versione con vulnerabilità
 * note — perché non serve: copiando le celle da Excel il contenuto finisce
 * negli appunti separato da tabulazioni, che `parseListone` riconosce già.
 */
export const FANTACALCIO_QUOTAZIONI_URL =
  "https://www.fantacalcio.it/quotazioni-fantacalcio";

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serializza la rosa della lega in CSV (una riga per giocatore acquistato). */
export function rosterToCsv(rows: RosterEntry[]): string {
  const header = ["Squadra", "Ruolo", "Giocatore", "Squadra reale", "Prezzo"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.teamName, r.role, r.playerName, r.realTeam, r.price]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

/** CSV di esempio scaricabile come modello. */
export const LISTONE_TEMPLATE = [
  "Ruolo,Nome,Squadra,Quotazione,FVM",
  "P,Sommer,Inter,18,20",
  "D,Bastoni,Inter,15,22",
  "C,Barella,Inter,24,45",
  "A,Lautaro Martinez,Inter,32,120",
].join("\n");
