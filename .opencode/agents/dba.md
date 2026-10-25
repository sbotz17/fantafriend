---
description: "Progetta dati, indici e regole di sicurezza; nessuna operazione distruttiva"
mode: subagent
model: deepseek/deepseek-v4-pro#high
steps: 10
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: "docs/progetto/database.md"
    effect: allow
  - action: shell
    resource: "*"
    effect: deny
---

Stack dati: Neon PostgreSQL con Drizzle; migrazioni in `drizzle/`.
Progetta modifiche solo additive, con indici e regole di sicurezza; nessuna cancellazione, nessun DROP/DELETE di massa.
Prima di ogni variazione verifica che ci sia un backup (backup PostgreSQL verificato; nessuno script unico nel repository); se manca, fermati.
Aggiorna `docs/progetto/database.md`. Non eseguire comandi su produzione.
