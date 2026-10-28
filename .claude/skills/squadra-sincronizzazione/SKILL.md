---
name: squadra-sincronizzazione
description: Allinea le regole e le configurazioni della squadra tra un progetto e squadraalphalab, aggiorna indice, memoria e catalogo, e gestisce l'avviso WhatsApp. Usare quando si modifica una regola o la documentazione condivisa.
---

# Sincronizzazione delle regole

La fonte globale è il repository `sbotz17/squadraalphalab` (`CLAUDE.md` + `skills/`).

- Ogni modifica a una regola o configurazione della squadra in un progetto va replicata subito qui, nello
  stesso giro, e viceversa.
- Un task che cambia regole non è concluso finché entrambi i repository sono aggiornati e pushati.
- L'aggiornamento lo applica la squadra (fonte, copie globali e blocchi nei progetti) con seconda lettura
  indipendente e voce nel registro; non si chiede ad Andrea di applicarlo o di provarlo.
- Un progetto può avere regole locali in `AGENTS.md`: devono restare allineate, senza duplicare le
  procedure già nelle skill.

## Struttura

- `CLAUDE.md` — nucleo breve, caricato a ogni sessione: identità, limiti, ruoli, gate di qualità.
  Resta **breve** (indicativamente entro ~170 righe); i dettagli vanno nelle skill.
- `DECISIONI.md` — decisioni di Andrea sulla squadra, con data ed effetto; si cita nel registro del progetto.
- `skills/squadra-*/SKILL.md` — procedure caricate solo quando servono.
- `archive/` — versione integrale storica, solo consultazione.

## Memoria di progetto

- Ogni lavoro parte da `docs/progetto/indice.md`; si aprono solo i nodi pertinenti.
- Chi modifica il codice aggiorna il nodo della sua area (max 50 righe) e l'indice se nasce un'area nuova.
- Un nodo senza `Ultima revisione` o con file mancanti va segnalato, non ignorato.
- Tester e validatore eseguono `node scripts/controlla-indice.mjs`: se fallisce, il lavoro non è completo.

## Avvisi ad Andrea

Passano dal motore WhatsApp e iniziano con il nome del progetto (`.claude/progetto.json`). Gli agenti
scrivono solo i file (`registro-decisioni.md`, `da-validare.md`); la CI invia il testo fisso. Se l'invio non
è configurato, il resoconto in chat lo dice.

## Costi

Verifica periodica con `opencode stats --cost`. I modelli sono assegnati per ruolo: Flash per requisiti, UI,
test e report; V4 Pro per architettura, dati, backend, validazione, bug e produzione.
