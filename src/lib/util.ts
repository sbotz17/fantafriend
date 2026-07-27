/** Converte un testo in uno slug: minuscole, senza accenti, con trattini. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export const ROLE_LABELS: Record<string, string> = {
  P: "Portiere",
  D: "Difensore",
  C: "Centrocampista",
  A: "Attaccante",
};

export const STATUS_LABELS: Record<string, string> = {
  setup: "Configurazione",
  auction: "Asta in corso",
  completed: "Completata",
};
