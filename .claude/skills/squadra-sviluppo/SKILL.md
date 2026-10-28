---
name: squadra-sviluppo
description: Flusso completo per un nuovo sviluppo o una modifica funzionale (analisi, architettura, dati, UI, sviluppo, test, manuale, validazione, rilascio). Usare con /sviluppo o quando Andrea chiede una funzione nuova.
---

# Flusso di sviluppo

Un task = un obiettivo verificabile, di norma **un file, una schermata o un servizio**. Mai "tutto insieme".

## Prima di iniziare: un solo lavoro per blocco

1. Individua il **blocco funzionale** della richiesta in `docs/progetto/blocchi.md` (es. `calendario`,
   `preventivi`, `clienti`). Se la richiesta non rientra in nessun blocco, il coordinatore lo aggiunge prima
   di iniziare. Se ne tocca più di uno, dividila in task; se non si può, occupa i blocchi in ordine
   alfabetico. Se il secondo è occupato, **rilascia subito il primo** e mettiti in coda: non si tengono
   blocchi mentre si aspetta.
2. Controlla stato e coda: `python3 scripts/blocco-squadra.py stato` e `... coda-lista <blocco>`. Se lo
   script non c'è, **non iniziare**: segnalalo e usa `~/.claude/scripts/blocco-squadra.py`.
3. Blocco libero e coda vuota: occupalo con
   `... occupa <blocco> --richiesta "<testo>" --sessione "<nome>"`.
4. Blocco occupato **o** con qualcuno già in coda: **non iniziare**; metti la richiesta in coda
   (`... coda <blocco> --richiesta "<testo>" --sessione "<nome>"`) e rispondi ad Andrea con il messaggio
   previsto dal nucleo (richiesta in corso, sessione, inizio, posizione in coda). Non creare ramo, non
   scrivere codice, non aprire PR, non pubblicare.
5. Alla chiusura (PR unita o lavoro abbandonato):
   `... rilascia <blocco> --motivo "<esito>" --sessione "<nome>"`. Solo la sessione che ha occupato può
   liberare; un blocco scaduto non si libera senza prova e senza avvisare Andrea. Solo dopo si prende il
   primo della coda.

Anche routing, shell, regole Firestore, CI, `pubspec` e deploy sono blocchi condivisi: vanno occupati e
serializzati. Le sessioni in parallelo sono ammesse solo su blocchi diversi e senza file condivisi.

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
   Le prove reali nella UI le esegue la squadra con build locale, browser automatizzato, emulatori, utenti
   di test e canali di anteprima: **non si chiede ad Andrea di provare**. Problemi → si torna al punto 5.
7. **Manuale** → `redattore-manuale` aggiorna manuale utente e note di rilascio.
8. **Validazione** → `validatore` dà APPROVATO o RESPINTO. RESPINTO → punti 5/6.
9. **Rilascio** → vedi skill `/squadra-rilascio`; il coordinatore unisce la PR e pubblica secondo i gate.
10. **Resoconto** ad Andrea a cose fatte: fatto, rilasciato, decisioni prese e in sospeso. Breve.

## Ciclo e limiti

- Il ciclo sviluppo → test → validazione si ripete al massimo **3 volte**; poi si ferma, resta fuori dal
  rilascio, diventa decisione in sospeso e Andrea viene avvisato.
- Per richieste piccolissime puoi saltare architetto, dba e designer; **mai** tester e validatore.
- Nessun task è `FATTO` senza test automatici e prova reale nella UI. Se una prova richiede un dispositivo,
  un account o un acquisto personale di Andrea, si usa un sostituto (emulatore, browser, utente di test);
  altrimenti l'area è `BLOCCATA`: la prova non si rimanda ad Andrea e non si dichiara superata.

## Riuso

Prima di creare widget, modelli, servizi, funzioni, query, policy, costanti o testi: cerca in
`docs/progetto/catalogo.md` e nel codice, estendi ciò che c'è, crea solo se serve e registra subito.
Tester e validatore respingono duplicati evitabili e catalogo non aggiornato.

## Nuovi sviluppi: prima gli audit bloccanti

Prima di riprendere nuovi sviluppi devono essere chiusi con prova reale nella UI:

1. accesso Google con il client OAuth di produzione: la squadra crea il client se ha già accesso al
   progetto Google Cloud dell'azienda e prova con un account di test dedicato, senza creare dati di business;
2. consegna push ad app chiusa: browser o emulatore dove dimostrano la consegna.

Se la prova richiede la creazione di un account, un dispositivo fisico o un acquisto, l'area resta
`BLOCCATA` e la decisione è di Andrea: **non gli si chiede di provare** e non si dichiara superata. Lo
sviluppo può proseguire su altro, ma il progetto non si pubblica finché l'audit non è chiuso.
