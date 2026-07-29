import { z } from "zod";

/** UUID usato come parametro di percorso `:id`. */
export const idParam = z.object({ id: z.uuid() });

/** Slug leggibile: minuscole, numeri e trattini (es. "lega-amici-2025"). */
export const slug = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "slug non valido: usa minuscole, numeri e trattini",
  );

/** Stagione in formato libero ma breve (es. "2025-26"). */
export const season = z.string().min(4).max(16);

/** Intero positivo per crediti/prezzi (in unità di budget del fantacalcio). */
export const positiveInt = z.number().int().positive();

/** Intero >= 0 per gli slot rosa. */
export const nonNegativeInt = z.number().int().min(0);
