import type { Role } from "./api";

export interface ParsedPlayer {
  name: string;
  realTeam: string;
  role: Role;
  baseQuotation: number;
}

export interface ParseResult {
  players: ParsedPlayer[];
  errors: string[];
  totalRows: number;
}

// Intestazioni riconosciute (in minuscolo) per ciascun campo.
const HEADER_ALIASES: Record<keyof ParsedPlayer, string[]> = {
  name: ["nome", "name", "giocatore", "calciatore"],
  realTeam: ["squadra", "team", "club", "squadra reale"],
  role: ["ruolo", "r", "role"],
  baseQuotation: [
    "quotazione",
    "qt",
    "qt.a",
    "qta",
    "quotazione attuale",
    "prezzo",
    "valore",
  ],
};

/** Sceglie il delimitatore più probabile guardando la prima riga. */
function detectDelimiter(line: string): string {
  const counts: Record<string, number> = {
    ";": (line.match(/;/g) ?? []).length,
    ",": (line.match(/,/g) ?? []).length,
    "\t": (line.match(/\t/g) ?? []).length,
  };
  let best = ",";
  let max = -1;
  for (const [delim, n] of Object.entries(counts)) {
    if (n > max) {
      max = n;
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
function mapHeaders(
  header: string[],
): Partial<Record<keyof ParsedPlayer, number>> {
  const normalized = header.map((h) => h.trim().toLowerCase());
  const map: Partial<Record<keyof ParsedPlayer, number>> = {};
  for (const field of Object.keys(HEADER_ALIASES) as (keyof ParsedPlayer)[]) {
    const idx = normalized.findIndex((h) =>
      HEADER_ALIASES[field].includes(h),
    );
    if (idx !== -1) map[field] = idx;
  }
  return map;
}

/**
 * Analizza un CSV del listone. Richiede una riga di intestazione con almeno le
 * colonne nome, squadra e ruolo; la quotazione è opzionale (default 1). La
 * stagione è fornita a parte (dalla lega).
 */
export function parseListone(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { players: [], errors: ["File vuoto."], totalRows: 0 };
  }

  const firstLine = trimmed.split(/\r?\n/, 1)[0];
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCsv(trimmed, delimiter);

  if (rows.length < 2) {
    return {
      players: [],
      errors: ["Servono un'intestazione e almeno una riga di dati."],
      totalRows: 0,
    };
  }

  const cols = mapHeaders(rows[0]);
  const missing: string[] = [];
  if (cols.name === undefined) missing.push("nome");
  if (cols.realTeam === undefined) missing.push("squadra");
  if (cols.role === undefined) missing.push("ruolo");
  if (missing.length > 0) {
    return {
      players: [],
      errors: [`Colonne mancanti nell'intestazione: ${missing.join(", ")}.`],
      totalRows: rows.length - 1,
    };
  }

  const players: ParsedPlayer[] = [];
  const errors: string[] = [];
  const dataRows = rows.slice(1);

  dataRows.forEach((row, index) => {
    const lineNo = index + 2; // +1 header, +1 base-1
    const name = (row[cols.name!] ?? "").trim();
    const realTeam = (row[cols.realTeam!] ?? "").trim();
    const roleRaw = (row[cols.role!] ?? "").trim();

    if (!name || !realTeam || !roleRaw) {
      errors.push(`Riga ${lineNo}: campi obbligatori mancanti.`);
      return;
    }
    const role = normalizeRole(roleRaw);
    if (!role) {
      errors.push(`Riga ${lineNo}: ruolo non valido "${roleRaw}" (usa P/D/C/A).`);
      return;
    }
    let baseQuotation = 1;
    if (cols.baseQuotation !== undefined) {
      const raw = (row[cols.baseQuotation] ?? "").trim().replace(",", ".");
      const n = Math.round(Number(raw));
      if (raw !== "" && Number.isFinite(n) && n >= 1) baseQuotation = n;
    }

    players.push({ name, realTeam, role, baseQuotation });
  });

  return { players, errors, totalRows: dataRows.length };
}

/** CSV di esempio scaricabile come modello. */
export const LISTONE_TEMPLATE = [
  "Ruolo,Nome,Squadra,Quotazione",
  "P,Sommer,Inter,18",
  "D,Bastoni,Inter,15",
  "C,Barella,Inter,24",
  "A,Lautaro Martinez,Inter,32",
].join("\n");
