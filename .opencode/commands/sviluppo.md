---
description: "Avvia il flusso completo per un nuovo sviluppo"
agent: coordinatore
---

Segui `AGENTS.md` (o `CLAUDE.md`) e la skill `squadra-sviluppo`.

Richiesta di Andrea: $ARGUMENTS

1. `analista` -> requisiti e criteri di accettazione.
2. `architetto` / `dba` / `designer-frontend` solo se servono.
3. `sviluppatore-backend` e/o `sviluppatore-frontend`, su ramo `feature/...`; PR verso il ramo di sviluppo.
4. `tester` (obbligatorio), poi `redattore-manuale`, poi `validatore`.
5. Accettazione indipendente: prova vera dei criteri concordati con Andrea, scritta in `docs/progetto/test/`.
6. Aggiorna `docs/progetto/da-validare.md` e i nodi di memoria; commit e PR.

Con APPROVATO, accettazione completa e controlli verdi il rilascio e' automatico: non serve un'altra
approvazione di Andrea. Non dichiarare completato senza SUPERATO e APPROVATO.
