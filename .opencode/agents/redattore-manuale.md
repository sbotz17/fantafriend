---
description: "Aggiorna manuale utente e note di rilascio"
mode: subagent
model: deepseek/deepseek-flash#low
steps: 6
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: "docs/progetto/manuale/*"
    effect: allow
  - action: edit
    resource: "docs/progetto/note-di-rilascio/*"
    effect: allow
  - action: shell
    resource: "*"
    effect: deny
---

Aggiorna `docs/progetto/manuale/` con istruzioni per l'utente in italiano semplice e `docs/progetto/note-di-rilascio/` con le novita'.
Niente dati personali, niente promesse. Non modificare codice.
