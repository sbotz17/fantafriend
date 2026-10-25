---
name: squadra-flutter
description: Regole di sviluppo Flutter valide per ogni progetto (livelli e architettura, niente valori magici, librerie, prestazioni, gestione errori, test, definizione di finito). Usare prima di scrivere o modificare codice in flutter_app.
---

# Sviluppo Flutter

Vale per tutti i progetti Flutter (Closer, Volty, Avanza...). Le regole dello **stack dati** stanno nelle
skill specifiche (`squadra-database-firestore`, Supabase/Postgres del progetto).

## Quale standard vale

- **Progetto esistente**: prima le convenzioni già scritte nelle regole del progetto e già presenti nel
  codice (librerie, cartelle, modo di rappresentare i dati). Non si migra a un altro stile "perché è
  meglio": una migrazione è un nuovo sviluppo che decide Andrea.
- **Progetto nuovo**: Material 3, stato con Riverpod, navigazione con go_router e rotte protette, modelli
  tipizzati (`freezed`/`json_serializable`), struttura per funzionalità.

## Architettura a tre livelli

Anche dentro la stessa cartella restano separati:

1. **schermate e widget** — cosa si vede, nessuna chiamata diretta al backend;
2. **logica applicativa** — stato, regole, casi d'uso;
3. **accesso ai dati** — repository e client del backend, in un solo punto.

Un widget che chiama il database è un errore di struttura, non una scorciatoia.

## Niente valori magici

- Stati, ruoli, tipi documento, nomi di rotte, chiavi di configurazione, nomi di collezioni e campi usati in
  più punti: costanti o enum in **un solo posto**, registrate nel catalogo.
- Configurazioni (URL, chiavi pubbliche, ambiente) solo da `--dart-define` o file di ambiente, mai nel
  codice. Sviluppo e produzione sempre separati.

## Librerie

- Prima di aggiungere un pacchetto: esiste già qualcosa nel progetto? È mantenuto? Funziona su web, Android,
  iOS e desktop se il progetto li copre? Serve davvero?
- La motivazione va nella pull request. `pubspec.yaml` è zona protetta: una nuova dipendenza la approva
  Andrea.

## Prestazioni

- `const` dove possibile, widget piccoli, stato il più vicino possibile a chi lo usa, niente lavoro pesante
  dentro `build`.
- Liste lunghe con `ListView.builder` e caricamento progressivo; mai caricare intere collezioni o tabelle.
- Niente query ripetute in un ciclo (N+1): usa una query con i dati collegati o una funzione lato server.
- Immagini ridotte e caricate solo quando servono.
- Rebuild inutili: `const`, `ValueListenableBuilder`, `select` sullo stato, chiavi corrette.

## Errori e stati

- Un solo punto trasforma gli errori di rete e del backend in messaggi chiari; mai errori tecnici a schermo,
  mai errori ignorati in silenzio.
- Ogni schermata che carica dati prevede **caricamento, vuoto, errore, contenuto**: quattro stati, non uno.
- `permission-denied` non è "errore generico": si diagnostica (regola, azienda, ruolo) prima di dichiarare
  chiuso il lavoro.

## Test e qualità

- Logica: test unitari. Schermate: widget test. Flussi completi: test di integrazione o E2E reale.
- `flutter analyze` senza problemi e `flutter test` verdi, sempre, prima di dire finito.
- Un bug corretto ha il test che lo riproduce: se manca, non è chiuso.

## Definizione di "finito"

1. rispetta i criteri di accettazione;
2. `flutter analyze` pulito, test verdi, build dell'ambiente riuscita;
3. nessuna chiave o configurazione di produzione nel codice;
4. ogni modifica ai dati ha la sua migrazione o regola e i test collegati;
5. niente doppioni: riusato ciò che esiste, catalogo aggiornato;
6. niente valori magici, errori gestiti, quattro stati curati;
7. manuale utente aggiornato;
8. decisioni rilevanti nel registro decisioni.

Se manca un punto, non è finito e non si dichiara completato.
