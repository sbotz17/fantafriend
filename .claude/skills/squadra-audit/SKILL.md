---
name: squadra-audit
description: Esegue l'audit-completa a basso consumo prima di un rilascio (ondate, sessioni riusate, massimo 2 tentativi per area, BLOCCATA invece di residuo). Usare con /audit.
---

# Audit completo a basso consumo

`docs/progetto/test/audit-completa.md` è il gate obbligatorio prima di ogni pubblicazione, staging e
produzione. Va eseguito senza sprecare token.

## Regole di esecuzione

- L'audit è un **indice**: si legge solo la sezione dell'area in prova.
- **Un tester e un validatore per ondata**, con sessione riusata; non un agente nuovo per ogni area.
- Test automatici **una volta per blocco** di codice, poi solo test mirati sulle correzioni.
- Comandi raggruppati e output riassunto; log completi solo se un test fallisce.
- Screenshot solo per i fallimenti o per la prova finale.
- Niente rilettura di `AGENTS.md`, manuale o intero repository: si citano file e nodi.
- Massimo **2 tentativi per area**; poi l'area è `BLOCCATA` e si passa alla successiva.
- Flash per test, UI e report; V4 Pro solo per bug complessi, dati, architettura e produzione.
- Controllo costi con `opencode stats --cost`.

## Ondate

1. **Accesso**: Google login, push, onboarding.
2. **Dati economici**: clienti, catalogo, preventivi.
3. **Agenda e comunicazioni**: calendario, task, notifiche, chat.
4. **Resto**: dashboard, visite, bandi, impostazioni, integrazioni, produzione.

## Dove si prova

- Su una **build locale** o su un **canale di anteprima** (Firebase Hosting preview channel), mai pubblicando
  direttamente su staging.
- Staging è un ambiente di rilascio: ci si pubblica solo quando l'audit è chiuso, perché è quello che Andrea
  apre per vedere il prodotto.
- Dopo il deploy su staging: smoke test in sola lettura sulle aree pubblicate.

## Per ogni area

- Criterio di accettazione preso dall'audit, non inventato.
- Prova reale nella UI: login, azienda attiva, CRUD, nessun `permission-denied`.
- Per i servizi esterni il flusso completo si prova nella UI, non solo l'endpoint con `curl`.
- Risposta del servizio normalizzata in un contratto unico, con test su risposta reale o fixture identica
  alla produzione. Un test con risposta inventata non sostituisce la prova UI.
- Se la UI non è provabile: `BLOCCATA`, non "SUPERATA con residuo".

## Esiti ammessi

`SUPERATA` · `BLOCCATA` · `FALLITA` (con bug da aprire nel flusso ritorni).

Un'area `BLOCCATA` impedisce il rilascio. Non esiste "pubblico con residuo".

## Report

Aggiorna il report con: data, area, prova eseguita, esito reale, residui. Tester `SUPERATO` + validatore
`APPROVATO` sono necessari perché il gate sia chiuso.
