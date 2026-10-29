---
name: squadra-audit
description: Esegue l'audit-completa con prove reali e ripetibili prima di un rilascio (standard di prova, stati PROVATA/BLOCCATA/DA RIFARE, tester e validatore indipendenti). Usare con /audit.
---

# Audit completo

`docs/progetto/test/audit-completa.md` è il gate obbligatorio prima di ogni pubblicazione, staging e
produzione. Non è un elenco di cose "viste": è la prova che le funzioni usate da Andrea funzionano.

## Standard di prova (obbligatorio)

L'elenco chiuso delle funzioni dell'area si fissa prima (da `docs/progetto/catalogo.md` o dalla mappa
funzionalità). Si annota lo stato **per funzione**; l'area è `PROVATA` solo se **tutte** le sue funzioni
sono `PROVATA`. Restringere l'area al flusso principale non è ammesso.

Un'area è `PROVATA` solo se ha **tutte** queste prove:

1. **Criterio scritto prima** dall'analista: cosa deve succedere, per chi, con quali dati.
2. **Percorso reale nella UI**: login, azienda attiva, azione dell'utente, risultato visibile. Non basta
   l'endpoint, il test unitario o la schermata che si apre.
3. **Persistenza**: ricarica completa e dato ancora presente.
4. **Caso negativo**: permesso negato, dato mancante, errore di rete, isolamento tra aziende. Almeno uno per
   funzione critica.
5. **Risposta reale del servizio**: si controlla status e corpo (es. 200/403/500), non solo che la UI non
   mostri errori.
6. **Test automatico che fallisce se la funzione si rompe**: si rompe la funzione (o si commenta la
   correzione) e si allega l'esecuzione **rossa** con commit e data. Un test che non è mai stato visto
   fallire non vale come prova.
7. **Evidenza**: passi, esito atteso/ottenuto, screenshot o log, **build e commit**.
8. **Tester `SUPERATO` + validatore `APPROVATO`**, in sessioni diverse da chi ha sviluppato. Il validatore
   riesegue le prove, non si fida del report.

## Cosa NON conta come prova

- "La schermata si apre" o "il test unitario passa".
- Un test con una risposta inventata al posto del servizio reale.
- Uno screenshot senza il passaggio che produce il risultato.
- Una prova su una build che viene ripubblicata durante il test.
- Un'area chiusa con "resta da provare": quella è `DA RIFARE` o `BLOCCATA`.
- Un test che passa anche se la funzione è rotta.

## Stati ammessi

`PROVATA` · `BLOCCATA` · `DA RIFARE` · `FALLITA` (bug confermato, apre un ritorno).

- `BLOCCATA`: manca un ambiente, un permesso, un dato o una prova che non si può fare.
- `DA RIFARE`: la prova c'è ma non è ripetibile, è incompleta o è stata fatta su una versione cambiata.
- `FALLITA`: bug confermato; resta `FALLITA` anche quando si riaprono le altre aree, finché il ritorno non
  è chiuso.
- Non esiste "SUPERATA con residuo". Se una funzione secondaria dell'area non è provata, l'area è `DA RIFARE`.

## Build e ambiente

- Si prova su **build locale** o **canale di anteprima** con commit tracciato. La versione si annota nel
  report.
- Staging è l'ambiente di rilascio: ci si pubblica solo con audit chiuso; è la versione che si mostra ad
  Andrea, che non deve provarla.
- Durante l'audit **non si pubblica**: se il sito cambia sotto i piedi, l'area diventa `DA RIFARE`.
- Dopo il deploy su staging: smoke test in sola lettura sulle aree pubblicate.

## Bug di Andrea = guasto del processo

Ogni cosa rotta segnalata da Andrea è una prova che l'audit era incompleto. Si tratta così:

1. si riproduce e si classifica (skill `squadra-ritorni`);
2. si cerca **perché il test non l'ha visto**;
3. si aggiunge il test che l'avrebbe fermato e si verifica che fallisca senza la correzione;
4. si riesegue l'area e le aree collegate;
5. si scrive nel registro ritorni e nel registro audit;
6. si riferisce ad Andrea in italiano semplice.

Non è un caso isolato e non si scarica su "errore umano": il processo deve impedirlo.

## Esecuzione a basso consumo

- L'audit è un **indice**: si legge solo la sezione dell'area in prova.
- **Un tester e un validatore per ondata**, con sessione riusata **solo dentro lo stesso ruolo**: due
  sessioni distinte (tester ≠ validatore) e mai la sessione che ha sviluppato. Se manca l'indipendenza,
  l'esito è `BLOCCATA`.
- Test automatici una volta per blocco; poi test mirati.
- Output riassunto; log completi solo sui fallimenti. Screenshot per la prova finale o per il fallimento.
- Massimo **2 tentativi per prova**; poi `BLOCCATA` e si passa avanti.
- Modelli: Flash per test/UI/report; V4 Pro per bug complessi, dati, architettura e produzione.
- Controllo costi con `opencode stats --cost`.
- Niente rilettura di `AGENTS.md`, manuale o intero repository: si citano file e nodi.

## Ondate

1. **Accesso**: login, Google, Face ID, reset password, onboarding, sessione.
2. **Dati economici**: clienti, catalogo, preventivi.
3. **Agenda e comunicazioni**: calendario, visite, task, notifiche, chat.
4. **Resto**: dashboard, bandi, impostazioni, integrazioni, produzione.

## Modello del report

Per ogni funzione, una riga con:

| Campo | Contenuto |
|---|---|
| Funzione | nome e ID (es. `CLI-03`) |
| Criterio | cosa deve succedere, derivato dal requisito/task **prima** del lavoro |
| Passi | cosa si è fatto nella UI |
| Atteso / ottenuto | esito reale, non “ok” |
| Build / commit | versione provata |
| Evidenza | percorso di screenshot/log nel repository o nella PR |
| Test che fallisce | comando e esecuzione rossa allegata |
| Stato | `PROVATA` / `BLOCCATA` / `DA RIFARE` / `FALLITA` |
| Tester / validatore | sessioni distinte e verdetti |

L'area ha stato `PROVATA` solo se tutte le righe lo sono.

## Gate tecnico

- Il registro `docs/progetto/test/audit-completa.md` (o il file indicato dal progetto) riporta per ogni area:
  stato, prove, evidenza, build/commit, tester, validatore, residui.
- Il deploy è **vietato** se una qualsiasi area non è `PROVATA`.
- Il controllo automatico non è ancora attivo in tutti i progetti: finché non lo è, il coordinatore esegue
  il controllo a mano, lo annota nel report e il deploy resta vietato. La data di attivazione e il task
  vanno scritti nel registro decisioni del progetto.
- Tester `SUPERATO` + validatore `APPROVATO` sono verdetti di ruolo; lo stato che sblocca è solo `PROVATA`.
