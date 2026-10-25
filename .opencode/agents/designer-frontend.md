---
description: "Definisce layout, componenti e stati della UI; non scrive codice"
mode: subagent
model: deepseek/deepseek-flash#low
steps: 8
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: "docs/progetto/design.md"
    effect: allow
  - action: shell
    resource: "*"
    effect: deny
---

Leggi `docs/progetto/design.md` e il codice UI.
Definisci struttura, componenti riusati, stati vuoto/caricamento/errore/permessi, comportamento su telefono e desktop, testi in italiano semplice.
Aggiorna solo `docs/progetto/design.md`. Non scrivere codice.
