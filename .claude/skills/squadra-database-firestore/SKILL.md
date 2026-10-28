---
name: squadra-database-firestore
description: Regole per progettare e modificare dati su Firestore (collezioni, regole di sicurezza, indici, query, contatori, transazioni, emulatore). Usare per Closer (commerciali) e Avanza, o quando si tocca firestore.rules o firestore.indexes.json.
---

# Firestore

Vale per i progetti che usano **Firestore**: **Closer** (`commerciali`, progetti `commerciali-prod` e
`commerciali-app`) e **Avanza** (`avanza`, `avanza-b62d7` e `avanza-test-c33ef`).

`campionato-broccoli` usa **Realtime Database**, non Firestore: questa skill non si applica. Se in futuro
passa a Firestore, va dichiarato nel registro decisioni prima di migrare.

## Modello dei dati

- Una collezione per entità di business; documenti con id stabili (`uid`, `aziendaId`, slug), mai id casuali
  usati come riferimento.
- Multi-azienda: ogni documento porta `aziendaId` e ogni query lo filtra **sempre**. Un documento senza
  proprietario è un buco di sicurezza, non una semplificazione.
- Sottocollezioni solo per dati che appartengono davvero al padre e si leggono insieme; se serve leggerli da
  soli o aggregarli, meglio collezione di primo livello.
- Denormalizza ciò che si legge spesso (nome cliente sul preventivo) e accetta la copia: su Firestore una
  lettura in meno vale più di un dato duplicato. Annota nel catalogo dove viene replicato.
- Date come `Timestamp`, importi come interi in centesimi o `Decimal` concordato, mai `double` per i soldi.
- Contatori e numerazioni (numero preventivo, progressivo) solo con `FieldValue.increment` dentro una
  transazione, mai "leggo, aggiungo 1, scrivo".

## Regole di sicurezza (`firestore.rules`)

Le regole sono l'unica autorizzazione reale: il client non protegge niente.

- Nessun `allow read, write: if true` su dati di utenti. Predefinito: negato.
- Ogni regola verifica proprietà **e** appartenenza: `request.auth != null` più il confronto con
  `resource.data.aziendaId` in lettura e `request.resource.data.aziendaId` in scrittura.
- Validare i campi in scrittura: `request.resource.data.keys().hasOnly([...])`, tipi, lunghezze, valori
  ammessi. Le regole non sono solo permessi: sono validazione.
- Ruoli e superadmin da custom claim (`request.auth.token.ruolo`), mai da un campo che il client può
  scrivere. Un campo `ruolo` modificabile dall'utente è una escalation.
- `get()` ed `exists()` dentro le regole costano letture e possono annidarsi: usali con misura.
- Le regole si modificano **nel repository**, mai solo nella console. Prima di ogni rilascio si prova
  l'emulatore.
- Ogni nuova collezione nasce con la sua regola e il suo test: regola senza test = regola non verificata.

## Indici e query

- Indici composti in `firestore.indexes.json`, versionati: un `where` su due campi più `orderBy` richiede
  l'indice, e senza indice la query fallisce con `failed-precondition`.
- Liste sempre paginate: `limit` + `startAfter`. Mai caricare una collezione intera.
- Niente query dentro un ciclo (N+1): usa `whereIn` (max 30 valori) o `getAll` sui riferimenti, oppure
  denormalizza.
- Evita listener realtime su collezioni grandi: ascolta il documento o la query filtrata e limitata.
- `collectionGroup` solo con indice dichiarato e con il filtro sull'azienda.

## Scritture e transazioni

- Più documenti che devono cambiare insieme: `runTransaction` o `WriteBatch` (max 500 operazioni).
- Le transazioni possono ritentare: dentro non mettere effetti collaterali (invii, chiamate HTTP).
- Invii (email, WhatsApp, push) mai dal client: passano da Cloud Function o Worker.

## Diagnosi degli errori

| Errore | Prima cosa da controllare |
|---|---|
| `permission-denied` | regola mancante o `aziendaId` non coerente; non è un bug dell'app |
| `failed-precondition` | indice composto mancante, non un problema di dati |
| `not-found` | documento cancellato o percorso sbagliato (id vs campo) |
| dato assente nella UI | query filtrata con un campo che non esiste su tutti i documenti |

## Ambienti e dati

- Progetti separati: staging con dati di test, produzione senza dati di test. Mai lo stesso progetto per
  entrambi.
- Regole, indici e funzioni si pubblicano per ambiente, con il progetto esplicitato nel comando.
- Prima di modificare dati di **produzione**: backup verificato. Cancellazioni di massa in produzione: mai da
  parte della squadra. Sul database di **test** le cancellazioni sono ammesse dopo aver verificato host/ref
  nella mappa degli ambienti del progetto.
- Ogni rilascio chiude con una prova di lettura e scrittura reale e nessun `permission-denied` nei log.
