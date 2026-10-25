---
name: squadra-sicurezza-app
description: Lista di controllo di sicurezza per ogni applicazione (autenticazione, autorizzazioni sul server, validazione input, segreti, dati personali, rischi OWASP) e come si chiude una revisione. Usare quando si toccano accessi, ruoli, dati sensibili, API, Worker, Cloud Functions o input degli utenti.
---

# Sicurezza dell'applicazione

Vale per **tutti** i progetti, qualunque sia lo stack. I dettagli della piattaforma stanno nelle skill
specifiche (`squadra-database-firestore`, skill Supabase/Postgres del progetto).

## Autenticazione

- Un solo sistema di autenticazione per progetto (quello già in uso): mai sistemi paralleli o "login di
  servizio" aggiunti per comodità.
- Password e token mai in chiaro sul dispositivo: usare l'archiviazione sicura del sistema.
- Sessioni con scadenza e rinnovo gestiti dal client ufficiale; il logout deve invalidare davvero la
  sessione, non solo svuotare la schermata.
- Messaggi di errore di accesso chiari per l'utente ma che non rivelano se un'email esiste.

## Autorizzazioni

- **Le decisioni si prendono sul server**: regole del database, funzioni, Worker. Nascondere un pulsante
  non è una protezione.
- Principio del minimo privilegio: ogni componente ha solo i permessi che gli servono.
- Ruoli e permessi non devono essere modificabili dal client. Se un ruolo vive in un documento o in un
  token, quel campo non deve essere scrivibile dall'utente.
- Ogni endpoint, funzione o Worker che non è pubblico per scelta verifica **chi** chiama e **se può**.
  Quelli pubblici (webhook) verificano la firma o il segreto del mittente.
- Controllo d'accesso rotto = gravità alta: cambiare un id nella richiesta non deve dare dati di un altro
  utente o di un'altra azienda.

## Input e dati

- Validare ogni input sul server (tipo, lunghezza, intervallo, valori ammessi), anche se l'app lo ha già
  validato.
- Nessun testo dell'utente eseguito, interpretato come istruzione o concatenato in query e comandi.
- File caricati: tipi e dimensioni ammessi, percorsi per utente/azienda, bucket o cartelle non pubbliche.
- Dati personali: solo quelli necessari; mai nei log, nei messaggi di errore, nei report di test, nelle note
  di rilascio o nei testi pubblici.
- Limiti di frequenza su ciò che costa: invio email/WhatsApp, push, OCR, AI, tentativi di accesso.

## Segreti

- Solo nei `.env` esclusi da Git o nei secret della piattaforma (Worker, Cloud Functions, CI).
- Mai nel codice, nei log, nelle pull request, nei report o in chat; mai in un file scaricabile dal client.
- Le chiavi amministrative (service account, `service_role`, API key di servizi) restano sul server.
- Se un segreto finisce in un log o in un commit: si considera compromesso, si ruota, si annota nel registro
  decisioni.

## Rischi comuni da controllare (OWASP)

1. Accesso ai dati altrui cambiando un id (controllo d'accesso rotto).
2. Injection (database, comandi) e testo non fidato trattato come istruzione.
3. Configurazioni deboli: CORS aperto senza motivo, funzioni senza verifica, bucket pubblici per errore.
4. Segreti esposti nel client o nel repository.
5. Dipendenze vecchie o non necessarie.
6. Errori che mostrano dettagli tecnici all'utente.
7. Assenza di limiti di frequenza su funzioni costose o sensibili.
8. Dati di test o account di prova rimasti in produzione.

## Esito di una revisione

Per ogni punto: **OK** oppure **PROBLEMA**, con file, riga, rischio concreto e correzione proposta.

- Un problema di gravità **alta** blocca il rilascio finché non è corretto.
- Un problema **medio** si corregge prima del rilascio o diventa decisione in sospeso registrata.
- Non si dichiara "sicuro": si dichiara "controlli eseguiti, problemi elencati, residui noti".
