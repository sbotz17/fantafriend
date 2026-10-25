# Dati — Fantafriend

Neon PostgreSQL con Drizzle; migrazioni in `drizzle/`.

## Regole
- Modifiche solo additive e reversibili.
- Backup verificato prima di ogni variazione (backup PostgreSQL verificato; nessuno script unico nel repository).
- Mai cancellazioni o aggiornamenti di massa sui dati esistenti.
