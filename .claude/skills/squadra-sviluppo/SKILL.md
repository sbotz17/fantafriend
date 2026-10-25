---
name: squadra-sviluppo
description: Flusso completo per un nuovo sviluppo o una modifica funzionale (analisi, architettura, dati, UI, sviluppo, test, manuale, validazione, rilascio). Usare con /sviluppo o quando Andrea chiede una funzione nuova.
---

# Flusso di sviluppo

Un task = un obiettivo verificabile, di norma **un file, una schermata o un servizio**. Mai "tutto insieme".

## Passi

1. **Analisi** → `analista` scrive/aggiorna `docs/progetto/requisiti.md` con criteri di accettazione
   verificabili. Dubbi: scegli l'interpretazione più prudente e reversibile, scrivila in
   `docs/progetto/registro-decisioni.md`; non ci si ferma ad aspettare.
2. **Architettura** → `architetto` (solo se serve) aggiorna `docs/progetto/architettura.md`, rispettando
   `.claude/architettura-preferita.md` e le decisioni già registrate.
3. **Dati** → `dba` (solo se ci sono dati) aggiorna `docs/progetto/database.md` e prepara migrazioni **solo
   additive**, controllate da `.claude/scripts/controlla-migrazioni.py`.
4. **UI** → `designer-frontend` definisce layout, componenti e stati in `docs/progetto/design.md`.
5. **Sviluppo** → `sviluppatore-backend` e `sviluppatore-frontend`, in parallelo se indipendenti; si
   coordinano sul contratto in `docs/progetto/architettura.md`. Prima riusa ciò che esiste e aggiorna
   `docs/progetto/catalogo.md`; annota in `docs/progetto/diario.md`.
6. **Test** → `tester` verifica i criteri di accettazione e scrive il report in `docs/progetto/test/`.
   Problemi → si torna al punto 5.
7. **Manuale** → `redattore-manuale` aggiorna manuale utente e note di rilascio.
8. **Validazione** → `validatore` dà APPROVATO o RESPINTO. RESPINTO → punti 5/6.
9. **Rilascio** → vedi skill `/squadra-rilascio`.
10. **Resoconto** ad Andrea a cose fatte: fatto, rilasciato, decisioni prese e in sospeso. Breve.

## Ciclo e limiti

- Il ciclo sviluppo → test → validazione si ripete al massimo **3 volte**; poi si ferma, resta fuori dal
  rilascio, diventa decisione in sospeso e Andrea viene avvisato.
- Per richieste piccolissime puoi saltare architetto, dba e designer; **mai** tester e validatore.
- Nessun task è `FATTO` senza test automatici e prova reale nella UI.

## Riuso

Prima di creare widget, modelli, servizi, funzioni, query, policy, costanti o testi: cerca in
`docs/progetto/catalogo.md` e nel codice, estendi ciò che c'è, crea solo se serve e registra subito.
Tester e validatore respingono duplicati evitabili e catalogo non aggiornato.

## Nuovi sviluppi: prima gli audit bloccanti

Prima di riprendere nuovi sviluppi devono essere chiusi con prova reale nella UI:

1. accesso Google in produzione (client OAuth e login reale);
2. notifiche push sul dispositivo (permesso concesso e consegna ad app chiusa).

Fino ad allora: solo correzioni, audit e test.
