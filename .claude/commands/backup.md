---
description: "Prepara un backup verificato prima di una variazione ai dati"
---

Chiama `guardiano-produzione` e prepara un backup verificato.

1. Elenca cosa si sta per modificare.
2. Esegui il backup previsto da `docs/progetto/ambienti.md` (backup PostgreSQL verificato; nessuno script unico nel repository).
3. Verifica che sia leggibile e completo; registra data, dimensione e responsabile in `docs/progetto/produzione.md`.
4. Non cancellare ne' sovrascrivere backup. Se non e' verificabile, fermati.
