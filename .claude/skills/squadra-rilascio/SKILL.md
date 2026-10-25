---
name: squadra-rilascio
description: Rilascio in staging o produzione con backup verificato, GO del guardiano, rollback pronto, smoke test e verifica post-rilascio. Usare con /rilascio o prima di ogni deploy/publicazione.
---

# Rilascio

Vale per correzioni **e** nuovi sviluppi, su staging e su produzione.

## Gate obbligatorio (prima di ogni pubblicazione)

`docs/progetto/test/audit-completa.md` deve essere eseguito e il report aggiornato con esiti reali e prove UI.

Staging non è una sandbox: è ciò che Andrea apre. Quindi le prove si fanno su build locale o canale di
anteprima e **solo dopo** si pubblica su staging.

Servono, tutti insieme:

1. audit-completa eseguito, nessuna area `BLOCCATA`;
2. `tester` → **SUPERATO**;
3. `validatore` → **APPROVATO**;
4. CI verde;
5. solo per la produzione: `guardiano-produzione` → **GO**, backup verificato, rollback pronto.

Basta un controllo non superato: **non si rilascia**. Mai forzare, mai "pubblico con residuo".

## Protocollo produzione

Nel dubbio la risposta è **NO-GO**.

1. **Niente di distruttivo**: vietati DROP, TRUNCATE, DELETE/UPDATE di massa o senza WHERE, rinomine o
   cambi di tipo che perdono informazioni, reset, push forzati, `reset --hard`.
2. **Backup completo e verificato** prima di toccare qualsiasi cosa (database, file utenti, configurazioni),
   con checksum e posizione registrati.
3. **Prova su copia** della produzione ripristinata dal backup, confronto prima/dopo. Differenze non
   spiegate = NO-GO.
4. **Rollback provato** (ripristino IDENTICO sulla copia, migrazioni provate sulla copia). Tag
   `ultimo-rilascio-ok` come punto di ritorno.
5. **Configurazioni e dati presenti solo in produzione non si sovrascrivono mai**; in produzione non
   entrano configurazioni, credenziali o dati di sviluppo.
6. **GO del `guardiano-produzione`** per *quel* rilascio. Il suo NO e `BLOCCO-SQUADRA.md` prevalgono.
7. **Esecuzione a passi**, uno alla volta, fermandosi al primo imprevisto.
8. **Verifica post-rilascio in sola lettura**: impronta confrontata col backup (nessuna tabella sparita,
   nessuna riga in meno), sito raggiungibile, accesso, azienda attiva, nessun `permission-denied`.
   Anomalia = ritorno automatico del codice + avviso immediato ad Andrea.
9. Tutto registrato in `docs/progetto/produzione.md`.

## Regola d'oro dei dati

- Nessun dato esistente viene alterato o perso: solo aggiunte.
- Backup verificato **prima** di ogni modifica ai dati reali, anche piccola.
- I backup non si cancellano e non si sovrascrivono, mai.
- Cancellare è un limite invalicabile: si archivia o si disattiva; la cancellazione reale la esegue solo
  Andrea dopo elenco esatto, motivo, backup e prova su copia.
- Il ripristino del database di produzione è sempre una decisione di Andrea.

## Ambienti

- Sviluppo/test: l'unico posto dove si lavora, con dati di test.
- Produzione: separata, solo codice validato, niente dati di test.
- Mai push diretto su `main` o ramo di produzione: si passa da PR e controlli.
- Verifica sempre `pwd` e `git remote -v` prima di modificare o pubblicare.

## Onestà

Non dichiarare mai "tutto sicuro al 100%". Riferisci le verifiche eseguite, i risultati e ciò che non è
stato possibile verificare. Non si dichiara "nessun bug": si dichiara "nessun bug noto, prove eseguite,
residui elencati".
