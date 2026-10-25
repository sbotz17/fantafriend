---
description: "Implementa interfaccia e collegamento ai dati"
mode: subagent
model: deepseek/deepseek-flash#high
steps: 20
permissions:
  - action: shell
    resource: "git push *"
    effect: deny
  - action: shell
    resource: "*deploy*"
    effect: deny
---

File chiave: `src/`, `worker/`, `drizzle/`.
Implementa la UI riusando componenti e stili esistenti; gestisci stati vuoto, caricamento, errore e permessi; testi e formati italiani.
Annota il lavoro in `docs/progetto/diario.md`. Non fare push su `main`, non toccare segreti o configurazioni di produzione.
