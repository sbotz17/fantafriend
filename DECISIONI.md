# Decisioni sulla squadra

## 2026-10-28 — Andrea non esegue il lavoro

**Decisione di Andrea** (chat del 28/10/2026): la squadra fa tutto, test compresi. Andrea non deve provare
funzioni, dispositivi o link, non deve unire pull request e non deve pubblicare.

**Effetto**
- La squadra esegue anche le prove reali nella UI con mezzi propri: build locale, browser automatizzato,
  emulatori, utenti e dati di test, canali di anteprima.
- Il coordinatore apre e unisce le PR verso staging dopo tester `SUPERATO` e validatore `APPROVATO`.
- La promozione in produzione la esegue la squadra dopo guardiano `GO`, audit chiuso, backup verificato e
  rollback pronto.
- Se una prova richiede un dispositivo, un account o un acquisto personale, si usa un sostituto; altrimenti
  l'area è `BLOCCATA` e non si blocca il resto.
- Le modifiche a regole, `.claude/`, hook, CI e zone protette le applica la squadra, con seconda lettura
  indipendente e voce nel registro.

**Restano decisioni di Andrea**: soldi, contratti, account, store (creazione account e pubblicazione su App
Store/Play), cancellazione dei dati di **produzione**, acquisto di servizi a pagamento e il pulsante di
blocco (`BLOCCO-SQUADRA.md` / `BLOCCO_SQUADRA`).

**Dati di test (28/10/2026)**: sul database di test la squadra può modificare e cancellare liberamente,
senza backup dedicato. Prima di ogni cancellazione verifica host e ref nella mappa
`docs/progetto/ambienti.md` (per Volty il test è `gefnursnhofqouupnkvx`). Se non è certo, si tratta come
produzione e ci si ferma. In produzione valgono la
regola d'oro, il backup verificato e il via libera di Andrea per la cancellazione.

**Seconda lettura indipendente**: la fa una sessione o un agente diverso da chi ha scritto la modifica, con
contesto separato. Chi ha scritto non può dichiararla fatta. Nel registro si annota chi l'ha fatta, quando e
con quale esito.

**Fonti aggiornate**: `CLAUDE.md` (nucleo) e le skill `squadra-sviluppo`, `squadra-rilascio`, `squadra-audit`,
`squadra-ritorni`, `squadra-sicurezza`, `squadra-flutter`, `squadra-sincronizzazione`, `squadra-dati`,
`squadra-database-firestore`.

**Da completare dalla squadra**: protezioni dei rami `staging`/`main` su GitHub con CI obbligatoria e divieto
di push forzati, compatibili con il workflow di sincronizzazione delle regole. Va fatto quando non ci sono
rilasci in corso; fino ad allora i gate valgono come regola, non come blocco tecnico.

## 2026-10-29 — Se Andrea trova un guasto, il test era sbagliato

**Decisione di Andrea** (chat del 29/10/2026): la squadra deve essere meglio di una persona e di lui. Se
Andrea trova una cosa rotta, la causa è che i test non sono stati fatti correttamente; tutti gli audit
vanno rivisti. Non deve succedere.

**Effetto immediato**
- Tutte le aree dell'audit sono riaperte, comprese quelle segnate `SUPERATA` con riserve. Lo stato di
  partenza è `DA RIFARE`; le aree con un bug confermato restano `FALLITA` finché il ritorno non è chiuso.
  Il coordinatore aggiorna i registri dei progetti entro il 31/10/2026; il validatore verifica che la
  riapertura sia stata fatta e che nessuna area resti `SUPERATA`.
- Un'area è `PROVATA` solo con lo standard della skill `squadra-audit`: criterio scritto prima, prova UI
  reale, persistenza, caso negativo, risposta reale del servizio, test che fallisce se la funzione si
  rompe, evidenza con build e commit, tester e validatore indipendenti.
- Non si chiude un'area con "resta da provare": è `DA RIFARE` o `BLOCCATA`.
- I test UI leggono l'albero di accessibilità e le risposte di rete, non solo il testo visibile.
- Ogni guasto segnalato da Andrea è un guasto del processo: causa, test che l'avrebbe fermato, riaudit
  dell'area, voce nel registro. Non è un caso isolato.
- La build in prova è fissata con commit; niente deploy durante l'audit. Il deploy è bloccato se il registro
  ha aree non `PROVATA`.
- Il lavoro della squadra deve essere **ripetibile e verificabile**: una persona si distrae, un test
  ripetibile no. Un test scritto male è peggio di nessun test.

**Responsabilità**: chi produce dichiara cosa ha provato e cosa no; chi verifica riesegue; il coordinatore
non chiude un'area senza evidenza. Tester e validatore sono due sessioni distinte, mai quella che ha
sviluppato. Il gate tecnico non è ancora attivo in tutti i progetti: finché non lo è, il controllo è
manuale e annotato, e il deploy resta vietato con aree non `PROVATA`. Se un guasto arriva ad Andrea, la squadra lo riconosce subito, corregge
la causa e aggiunge il test che lo avrebbe fermato.

## 2026-10-29 — La squadra non si ferma mai

**Decisione di Andrea** (chat del 29/10/2026): «mettilo nelle regole della squadra» e «la squadra non si deve mai fermare».
Una sessione non può chiudere il lavoro annunciando un passo («proseguo con…», «lo faccio ora») e poi
fermarsi: ciò che si annuncia si esegue, oppure si mette in coda con motivo, codice del task e chi lo sblocca.

**Effetto**
- Durante le attese esterne (CI, deploy, servizi, documenti) si prosegue su altro lavoro utile e si riprende
  il passo appena è possibile; non si chiede ad Andrea di riavviare la sessione.
- Prima di chiudere una risposta si rilegge ciò che è stato annunciato: niente resta annunciato e non fatto.
- Restano fermi solo i lavori dipendenti da un blocco di Andrea (`BLOCCO-SQUADRA.md` / `BLOCCO_SQUADRA`), da
  una decisione riservata, da un segreto o accesso che solo Andrea può fornire, o dalla cancellazione dei dati
  di produzione. Tutto il resto prosegue.

**Propagazione**: il workflow `sync-squad-rules.yml` fonde `CLAUDE.md` nei blocchi `SQUADRA-AGENTI` dei progetti
(`AGENTS.md`, o `CLAUDE.md` se manca) e copia `DECISIONI.md` e le skill `squadra-*`; ogni progetto allinea anche
il proprio `CLAUDE.md`.

**Seconda lettura indipendente**: sessione separata da chi scrive, prima del merge; esito annotato nel
registro del progetto che ha aperto il lavoro.

## 2026-10-30 — Costi dei modelli: DeepSeek a pagamento solo per lo sviluppo

**Decisione di Andrea** (chat del 30/10/2026): consumare meno crediti DeepSeek usando il modello a pagamento
solo per lo sviluppo; test, analisi e controlli su modelli gratuiti performanti. Su richiesta successiva,
**il validatore resta l'unico controllo sempre a pagamento**.

**Numeri misurati a mano** sul database locale di OpenCode (sessioni degli ultimi 30 giorni; non sono
riproducibili dal repository): tester 23 sessioni = 0,30 $ (1,3 centesimi l'una),
analista 8 = 0,08 $, validatore `v4-pro#high` 28 = 1,12 $ (4 centesimi), sviluppatore-backend 38 = 2,29 $;
la **sessione interattiva principale** 12 sessioni = 10,84 $ (90 centesimi l'una, il 65% della spesa, con
194 milioni di token di cache riletta per sessione).

**Effetto**
- Modello predefinito delle sessioni: `opencode/deepseek-v4.1-flash-free` (gratuito).
- Agenti gratuiti: `coordinatore`, `analista`, `designer-frontend`, `tester` (`#high`); `gestore-ritorni`,
  `redattore-manuale`, `marketing` (`#low`).
- Agenti a pagamento: `sviluppatore-backend`, `risolutore-bug`, `architetto`, `dba`, `revisore-sicurezza`,
  `guardiano-produzione`, **`validatore`** su `deepseek/deepseek-v4-pro#high`; `sviluppatore-frontend` su
  `deepseek/deepseek-flash#high`.
- `deepseek/deepseek-flash#low` non è mai il predefinito: il risparmio rispetto a `#high` è di ~0,2 centesimi
  a sessione, il calo di ragionamento no.
- Ripiego: se il modello gratuito è occupato o in limite, `~/.config/opencode/scripts/modello-agenti.sh
  ripiego` porta gli agenti gratuiti su `deepseek/deepseek-flash#high`; `gratis` li riporta indietro; `stato`
  elenca i modelli e avvisa se un agente a pagamento finisce su un gratuito. Lo script è globale della
  macchina (non versionato): la regola è il criterio, le righe `model:` stanno nella configurazione locale
  degli agenti.
- La chiave DeepSeek vive in `~/.config/opencode/deepseek.key` (permessi 600) e la configurazione la legge con
  `{file:...}`: non si scrive nei file di configurazione né nel repository.
- Leva sui costi: sessioni interattive più corte (`/new` quando si cambia argomento).
- Se un modello gratuito dà esiti incoerenti in un audit o in una validazione, quell'agente torna a pagamento
  prima di chiudere l'area.

**Prove fatte**: i modelli gratuiti rispondono e usano gli strumenti (provato su `deepseek-v4.1-flash-free`
`#high`, `glm-5.3-flash-free`, `mimo-v2.6-flash-free`); l'agente `tester` parte con il modello gratuito;
l'agente `validatore` parte con `deepseek-v4-pro`; DeepSeek a pagamento risponde ancora con la chiave da file;
il giro completo `ripiego` → `gratis` dello script lascia invariati gli agenti a pagamento.
