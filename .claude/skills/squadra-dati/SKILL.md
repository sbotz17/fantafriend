---
name: squadra-dati
description: Principi comuni a ogni database (vincoli, indici, transazioni, migrazioni solo additive, query sicure, multi-azienda, backup). Usare prima di progettare o modificare dati, quando si scrive una query importante o si prepara una migrazione.
---

# Dati: principi comuni

Vale per ogni progetto, qualunque sia il database. I dettagli della piattaforma stanno nelle skill
specifiche: `squadra-database-firestore` per Firebase, la skill Postgres/Supabase del progetto per gli altri.

## Progettazione

- **I vincoli stanno nel database, non solo nell'app**: campi obbligatori, valori ammessi, unicità,
  relazioni. Meglio che il database rifiuti un dato incoerente che l'app lo mostri.
- Tipi esatti: importi con un tipo decimale o interi in centesimi (mai virgola mobile per i soldi), date con
  fuso orario, identificatori stabili.
- Un dato ha **un solo posto dove nasce**: le copie per velocità di lettura sono ammesse ma dichiarate nel
  catalogo, con la regola di chi le aggiorna.
- **Multi-azienda**: ogni dato porta il proprietario (azienda o utente) e ogni lettura lo filtra. Un filtro
  mancante non è una svista, è una fuga di dati.

## Query

- Sempre paginate; mai caricare una collezione o tabella intera per una schermata.
- Niente query dentro un ciclo (N+1): una query con i dati collegati, una funzione lato server o una
  denormalizzazione dichiarata.
- Mai costruire query concatenando testo degli utenti: solo parametri.
- Query pesanti: si guarda il piano o il costo sul database di test prima di proporle.

## Transazioni e concorrenza

- Operazioni che toccano più documenti o tabelle insieme vanno in **una sola transazione**: o tutto o niente.
- Contatori e numerazioni progressive li gestisce il database (sequenza, incremento atomico, funzione), mai
  "leggo, aggiungo uno, scrivo".
- Dentro una transazione nessun effetto collaterale (invii, chiamate HTTP, email): solo scritture.

## Migrazioni e modifiche

- Ogni modifica allo schema è una **migrazione nuova, versionata**, non una modifica a mano sul database
  reale.
- Solo **aggiunte sicure**: niente cancellazione di tabelle, colonne o campi; niente cancellazioni o
  aggiornamenti di massa; niente cambi di tipo che perdono informazioni. Le rimozioni sono un passo separato
  deciso da Andrea.
- Il codice precedente deve continuare a funzionare dopo la migrazione: prima si aggiunge, poi si usa, solo
  alla fine (con decisione) si rimuove.
- Dati di partenza solo per tabelle di configurazione, mai dati di prova in produzione.

## Sicurezza dei dati

- Backup verificato **prima** di ogni modifica ai dati reali, con impronta e posizione registrate.
- I backup non si cancellano e non si sovrascrivono, mai.
- Ambienti separati: il database di test non è quello di produzione, e i dati non si copiano dalla
  produzione verso il test senza anonimizzarli.
- Dati personali: solo quelli necessari, mai nei log o nei report.

## Verifica prima/dopo

Per ogni modifica ai dati: conteggi e impronta (checksum o campione) prima e dopo devono coincidere, salvo
le sole aggiunte previste. Una differenza non spiegata blocca il rilascio.
