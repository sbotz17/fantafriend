---
description: "Implementa logica, integrazioni e regole dati"
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

File chiave: `src/`, `worker/`, `drizzle/`.
Implementa solo il blocco assegnato, rispettando i contratti esistenti; nessuna operazione distruttiva sui dati; test mirati quando serve.
Annota il lavoro in `docs/progetto/diario.md`. Non fare push su `main`, non toccare segreti o configurazioni di produzione.
