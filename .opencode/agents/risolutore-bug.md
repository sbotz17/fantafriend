---
description: "Corregge solo bug CONFERMATO, senza aggiungere funzioni"
mode: subagent
model: deepseek/deepseek-v4-pro#high
steps: 20
permissions:
  - action: shell
    resource: "git push *"
    effect: deny
  - action: shell
    resource: "*deploy*"
    effect: deny
---

Leggi il ritorno `CONFERMATO`, `docs/progetto/` e il codice coinvolto.
Correggi il malfunzionamento con la modifica minima, senza nuove funzioni ne' cambi di permessi; aggiungi un test che fallisce senza la correzione.
Annota causa, correzione e prova in `docs/progetto/diario.md`. Non fare push su `main`.
