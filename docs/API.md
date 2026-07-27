# FantaFriend — API del Worker

API REST servita dal Cloudflare Worker (Hono + Drizzle su Postgres/Neon).
Tutte le rotte sono sotto `/api`. Il corpo delle richieste e delle risposte è
JSON. Gli errori hanno sempre la forma `{ "error": "messaggio" }`
(la validazione degli input restituisce invece il dettaglio degli errori Zod).

## Configurazione

Il Worker legge la connection string dal binding `DATABASE_URL`:

- **Sviluppo locale**: copia `.dev.vars.example` in `.dev.vars`.
- **Produzione**: `wrangler secret put DATABASE_URL`.

Se manca, gli endpoint che usano il database rispondono `500` con
`{"error":"DATABASE_URL non configurata sul Worker"}`.

## Autenticazione

L'autenticazione usa **sessioni server-side**: dopo signup/login il Worker
imposta un cookie `ff_session` **HttpOnly** contenente un token opaco; nel
database ne è salvato solo l'hash SHA-256 (tabella `sessions`). Le password sono
protette con **PBKDF2-SHA256** (salt per utente).

Tutte le rotte sotto `/api` **richiedono l'autenticazione**, tranne
`/api/health` e `/api/auth/*`. Le richieste non autenticate ricevono `401`
`{"error":"Autenticazione richiesta"}`. Il cookie viene inviato
automaticamente dal browser; con `curl` usare `-c cookies.txt`/`-b cookies.txt`.

| Metodo | Percorso | Descrizione |
| --- | --- | --- |
| POST | `/api/auth/signup` | Registra un utente. Body: `{ email, name, password }` (password min 8). Crea la sessione. |
| POST | `/api/auth/login` | Accedi. Body: `{ email, password }`. Crea la sessione. `401` se credenziali errate. |
| POST | `/api/auth/logout` | Chiude la sessione corrente e cancella il cookie. |
| GET | `/api/auth/me` | Utente autenticato `{ id, email, name }`. |

### Autorizzazione (multi-tenant)

L'accesso alle risorse è basato sull'appartenenza all'organizzazione
(`organization_members`). Chi crea un'organizzazione ne diventa `owner`.

- Le liste mostrano **solo** le risorse delle organizzazioni di cui sei membro
  (es. `GET /api/organizations` restituisce solo le tue).
- Leggere/modificare una lega, le sue squadre, il listone in asta e il budget
  richiede di essere **membro** dell'organizzazione della lega; in caso
  contrario la risposta è `403`.
- Le operazioni amministrative (modifica/eliminazione di organizzazione o lega)
  richiedono ruolo `owner`/`admin` (l'eliminazione dell'organizzazione solo
  `owner`).
- Il catalogo giocatori (`/api/players`) è una risorsa condivisa: leggibile e
  modificabile da qualsiasi utente autenticato.

## Convenzioni

- Gli identificativi sono UUID.
- `season`: stringa breve (es. `"2025-26"`).
- `slug`: minuscole, numeri e trattini (es. `"lega-amici"`).
- I crediti (`budget`, `price`, `amount`) sono interi positivi.
- Codici: `200` ok, `201` creato, `204` eliminato, `400` input non valido,
  `404` non trovato, `409` conflitto (unicità/foreign key), `500` errore server.

---

## Health

| Metodo | Percorso | Descrizione |
| --- | --- | --- |
| GET | `/api/health` | Stato del servizio (non richiede DB). |

## Organizzazioni

| Metodo | Percorso | Descrizione |
| --- | --- | --- |
| GET | `/api/organizations?ownerId=` | Elenco (filtro opzionale per proprietario). |
| POST | `/api/organizations` | Crea. Body: `{ name, slug }`. L'utente autenticato ne diventa proprietario e membro `owner`. |
| GET | `/api/organizations/:id` | Dettaglio. |
| PATCH | `/api/organizations/:id` | Aggiorna `{ name?, slug? }`. |
| DELETE | `/api/organizations/:id` | Elimina. |
| GET | `/api/organizations/:id/members` | Membri dell'organizzazione. |

## Leghe

| Metodo | Percorso | Descrizione |
| --- | --- | --- |
| GET | `/api/leagues?organizationId=` | Elenco (filtro opzionale per organizzazione). |
| POST | `/api/leagues` | Crea. Body: `{ organizationId, name, slug, season, budget?, status?, slotsGoalkeeper?, slotsDefender?, slotsMidfielder?, slotsForward? }`. |
| GET | `/api/leagues/:id` | Dettaglio. |
| PATCH | `/api/leagues/:id` | Aggiorna configurazione/stato. |
| DELETE | `/api/leagues/:id` | Elimina (a cascata: squadre, rose, offerte). |

`budget` default 500; slot default 3/8/8/6; `status` ∈ `setup` \| `auction` \| `completed`.

## Squadre

| Metodo | Percorso | Descrizione |
| --- | --- | --- |
| GET | `/api/leagues/:leagueId/teams` | Squadre della lega. |
| POST | `/api/leagues/:leagueId/teams` | Crea. Body: `{ name, ownerUserId? }`. |
| GET | `/api/teams/:id` | Dettaglio con rosa e budget residuo (`{ total, spent, remaining }`). |
| PATCH | `/api/teams/:id` | Aggiorna `{ name?, ownerUserId? }` (`null` per slegare l'utente). |
| DELETE | `/api/teams/:id` | Elimina. |

## Giocatori (listone)

| Metodo | Percorso | Descrizione |
| --- | --- | --- |
| GET | `/api/players?season=&role=&search=` | Elenco filtrabile (ruolo `P/D/C/A`, ricerca per nome). |
| POST | `/api/players` | Crea singolo. Body: `{ name, realTeam, role, baseQuotation?, season }`. |
| POST | `/api/players/bulk` | Import listone. Body: `{ players: [...] }`. I duplicati (nome+squadra+stagione) vengono ignorati. |
| GET | `/api/players/:id` | Dettaglio. |
| PATCH | `/api/players/:id` | Aggiorna. |
| DELETE | `/api/players/:id` | Elimina. |

## Asta, rose e budget

| Metodo | Percorso | Descrizione |
| --- | --- | --- |
| POST | `/api/leagues/:leagueId/roster` | Aggiudica un giocatore. Body: `{ fantasyTeamId, playerId, price }`. |
| GET | `/api/leagues/:leagueId/roster` | Rosa completa della lega (squadra + giocatore). |
| DELETE | `/api/roster/:id` | Svincola (annulla l'aggiudicazione). |
| GET | `/api/leagues/:leagueId/budget` | Riepilogo budget/slot per ogni squadra. |
| POST | `/api/leagues/:leagueId/bids` | Registra un'offerta. Body: `{ fantasyTeamId, playerId, amount }`. |
| GET | `/api/leagues/:leagueId/bids?playerId=` | Storico offerte (più recenti prima). |

L'aggiudicazione (`POST .../roster`) applica le regole del fantacalcio:

1. la squadra deve appartenere alla lega e il giocatore deve esistere;
2. lo **slot del ruolo** non deve essere già completo;
3. la spesa non deve superare il **budget** della squadra;
4. deve restare **almeno 1 credito per ogni slot ancora da riempire**, così la
   rosa è sempre completabile;
5. un giocatore può appartenere a **una sola squadra** per lega (vincolo di
   unicità → `409`).

Le aggiudicazioni sono bloccate quando la lega è in stato `completed`.
