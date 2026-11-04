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

## 2026-10-30 — Lo strumento dei modelli arriva in ogni progetto

**Perché**: la regola del 30/10/2026 citava uno strumento (`modello-agenti.sh`) che esisteva solo sulla
macchina di chi l'aveva scritto; negli altri progetti il comando non c'era. Segnalato dalla seconda lettura
indipendente della PR #6.

**Effetto**
- Il file `scripts/modello-agenti.sh` sta in questo repository e `sync-squad-rules.yml` lo copia in
  `scripts/` di ogni progetto a ogni sincronizzazione, come le skill: file unico, mai personalizzato.
- Funziona da qualunque cartella del progetto (cerca `.opencode/agents` accanto allo script e poi nella
  cartella corrente); se un progetto non ha agenti OpenCode, esce con un messaggio chiaro senza toccare nulla.
- `stato` elenca i modelli e avvisa se un agente che deve restare a pagamento finisce su un modello gratuito;
  `gratis` e `ripiego` cambiano **solo** gli agenti di test e controllo.
- La regola in `CLAUDE.md` ora dice il percorso nel progetto, con la copia globale
  `~/.config/opencode/scripts/modello-agenti.sh` come riserva.
- L'eccezione al divieto di push diretto del workflow di sincronizzazione comprende ora anche questo
  strumento: resta escluso tutto il resto (codice, dati, configurazioni).

**Prove richieste prima del merge**: `bash -n` e `controlla-riassunto.py` verdi; esecuzione reale di
`stato` da una copia del progetto; verifica dopo il merge che almeno un progetto abbia ricevuto il file e
che il comando funzioni lì.

## 2026-11-02 — Lista STOP: chiarezza sull'autonomia operativa

**Decisione di Andrea** (chat del 2/11/2026): la squadra continua a bloccarsi troppo spesso anche dove
ha piena autonomia, sia in Claude Code che in OpenCode. Chiede di risolvere una volta per tutte la
problematica perché la squadra lavori senza il suo consenso dove non serve e dove è autonoma.

**Contesto**: la decisione del 29/10/2026 «la squadra non si deve mai fermare» era già in vigore, ma la
clausola «incertezza sul proprio lavoro o su un esito» che seguiva (nella stessa sezione) la contraddiceva
in pratica: un modello linguistico non è mai «del tutto sicuro», quindi interpretava quella clausola come
motivo di blocco quasi sempre. Questa voce chiarisce e integra la decisione del 29/10.

**Effetto**
- La clausola «incertezza sul proprio lavoro o su un esito» è rimossa come causa di stop autonomo.
  Sostituita da «errore già commesso e verificato come tale»: solo un danno concreto già avvenuto, non
  l'incertezza preventiva normale durante il lavoro.
- Aggiunta la sezione **"Lista STOP"** in `CLAUDE.md`: 5 cause di blocco con chiarimento esplicito.
  Tutto ciò che non è in lista: PROCEDI.
- Chiarito che la Lista STOP dice quando chiedere ad Andrea; non sospende i Limiti invalicabili né i gate
  di qualità (BLOCCATA, NO-GO, deploy vietato con aree non PROVATA).
- Chiarito che la normale incertezza si annota nel report e non blocca; le approvazioni obbligatorie
  (seconda lettura, GO del guardiano) restano tali.

**File aggiornati in questa PR** (ramo `regole/lista-stop-autonomia`, PR #8):
- `squadraalphalab/CLAUDE.md` (fonte globale)
- `squadraalphalab/DECISIONI.md` (questa voce)

**File aggiornati fuori da questa PR** (modifiche locali non committate, in coda al blocco
`processi-squadra` di Volty — posizione 2):
- `volty-staging/CLAUDE.md`: sezione "Quando fermarsi e valutare insieme" riscritta
- `volty-staging/AGENTS.md`: Lista STOP aggiunta nel blocco `SQUADRA-AGENTI` (sarà sovrascritta dal sync)

**Nota tecnica — `~/.claude/CLAUDE.md`**: la copia locale del nucleo sul computer di Andrea non è
aggiornata in questa PR perché la modalità auto-mode di Claude Code classifica la modifica ai propri file
di configurazione come auto-modifica e la blocca. Fino all'allineamento, le sessioni Claude Code caricano
la clausola «incertezza» nella vecchia forma; le sessioni OpenCode usano `AGENTS.md` (che verrà aggiornato
dal sync) e non subiscono questo problema. Per allineare `~/.claude/CLAUDE.md`: lanciare
`local-setup/sync-regole.sh` dopo il merge, oppure aprirlo in una sessione interattiva e sostituire
«incertezza sul proprio lavoro o su un esito» con «errore già commesso e verificato come tale», poi
aggiungere la sezione "Lista STOP" subito dopo la sezione "La squadra non si ferma mai".

**Seconda lettura indipendente**: condotta il 2/11/2026 dal `validatore` (sessione separata, agente
`af02219123b7084f8`). Primo esito: RESPINTO — 5 problemi corretti nella stessa sessione (voce 5 mancante
nella tabella, passaggio saltato su produzione/rilascio/regole, conflitto con Limiti invalicabili e gate,
DECISIONI.md inesatto, clausola 24 ore in volty-staging). Secondo esito (agente `a5a602294cf790bbe`):
**APPROVATO** — tutti i 7 punti verificati OK. Nota minore non bloccante: la voce 5 parla di "danno
concreto e verificato", ma un passaggio saltato su produzione/rilascio può non aver ancora causato danni;
il caso è comunque coperto dal disclaimer e dai gate di qualità.

## 2026-11-01 — Avviso di fine lavoro su Telegram

**Decisione di Andrea** (chat del 01/11/2026): ogni finestra aperta e ogni sessione eseguita in OpenCode e in
Claude Code (anche nelle sessioni Code dell'app Desktop), finito il lavoro richiesto, lo comunica sulla chat Telegram configurata. Il messaggio deve
dire il numero di task, il progetto e la richiesta fatta.

**Effetto**
- OpenCode: plugin globale `~/.config/opencode/plugins/notifica-telegram`. Scatta a fine turno (ultimo passo
  del modello con `finish` diverso da `tool-calls`). Le sessioni figlie non avvisano.
- Claude Code (comprese le sessioni Code dentro l'app Desktop): hook globale `Stop` in
  `~/.claude/settings.json`, che legge il transcript della sessione e ricava progetto, task completati,
  richiesta ed esito. Le chat normali dell'app Claude non eseguono hook: lì non arriva nulla.
- Canale: `@volty_avvisi_bot` (canale «Volty Avvisi», T-45). Il token si legge dalle credenziali locali
  di Volty; la chat id sta in `~/.config/notifiche/telegram.env` (permessi 600).
- Formato unico e registro in `~/.local/share/notifiche/`. Un turno concluso produce un solo messaggio,
  anche con più istanze del plugin caricate su progetti diversi (blocco atomico per sessione e messaggio).
- Se l'esito termina con una domanda (`?`) il messaggio è marcato «In attesa di una risposta» invece di
  «Lavoro terminato» (euristica sul testo, non comprensione della domanda).
- Se l'invio fallisce la sessione prosegue; l'errore resta nel registro locale.

**Stato (02/11/2026)**
- Meccanica installata e usata su turni reali: al 02/11/2026 il registro riporta oltre 40 invii OpenCode
  (terminale e desktop) e oltre 30 Claude Code/Desktop, un solo messaggio per turno.
- OpenCode e Claude Code/Desktop hanno superato le prove reali (riga `INVIATA`, messaggio accettato da
  Telegram). Il conteggio dei task segue l'ultimo elenco del piano più gli avanzamenti successivi; la
  richiesta mostra l'ultima richiesta vera di Andrea, saltando riprese automatiche, passaggi tra sessioni e
  riassunti di compattazione.
- L'area **non è ancora dichiarata `PROVATA`**: manca l'esito della seconda lettura indipendente.

**Seconda lettura indipendente**: 02/11/2026, giro 4 — esito **APPROVATO** (revisione indipendente sul ramo
`regola/avvisi-fine-lavoro`, PR #9). Chiusi i due rilievi del giro precedente: l'esito non manca più (campo
`last_assistant_message`, ricaduta sul transcript, altrimenti «esito non disponibile nel transcript» con stato
«attesa»; prova reale delle 15:41Z con `Esito:</b> OK`) e il perimetro è «Claude Code (anche nelle sessioni
Code dell'app Desktop)», chat normali escluse. Numeri del registro riverificati (44 invii OpenCode, 35
Claude) e nessuna dichiarazione `PROVATA` anticipata. L'area è `PROVATA`.

## 2026-11-04 — Manuale unificato della squadra

**Contesto**: il file `squadraalphalab/CLAUDE.md` era un nucleo volutamente breve (~290 righe) che rimandava
alle skill per le procedure. Il file `volty-staging/CLAUDE.md` conteneva invece il manuale completo della
squadra (~250 righe di regole), separato ma con sovrapposizioni e alcune sezioni più aggiornate. I due file
si erano evoluti indipendentemente.

**Decisione**: Andrea ha chiesto (04/11/2026) di unire il meglio dei due file in un unico manuale completo in
`squadraalphalab/CLAUDE.md`, che fa da base per tutti i progetti. I progetti mantengono il proprio `CLAUDE.md`
solo per le specificità di progetto (stack, convenzioni UI/DB, comandi rapidi). La priorità è sempre data al
`CLAUDE.md` del progetto sui contenuti di squadra.

**Effetto**
- `squadraalphalab/CLAUDE.md` ampliato da ~290 a ~680 righe: incorpora autonomia e limiti, responsabilità,
  flusso standard completo (11 passi), flusso ritorni e bug, assistente integrato, accettazione e rilascio,
  riuso e ordine, ambienti (con variante un-repo-due-rami), stack, regola d'oro dei dati (8 punti),
  protocollo produzione (9 punti).
- Generalizzazioni applicate: rimosso l'ID del progetto Supabase di test `gefnursnhofqouupnkvx` (sostituito
  con rimando a `docs/progetto/ambienti.md`), rimosso `@volty_avvisi_bot` (sostituito con «canale Telegram
  del progetto»), rimossi i nomi dei workflow CI specifici di Volty.
- `REGOLE-IN-BREVE.md` aggiornato di conseguenza: stesse generalizzazioni, aggiunto `revisore-sicurezza`
  alla tabella ruoli.
- Il `CLAUDE.md` di ogni progetto (a partire da `volty-staging`) potrà in seguito essere snellito
  rimuovendo le sezioni di squadra duplicate, conservando solo il contenuto specifico.

**File aggiornati** (ramo `feature/manuale-unificato`, PR #10, merged 2026-11-04):
- `squadraalphalab/CLAUDE.md`
- `squadraalphalab/DECISIONI.md` (questa voce)
- `squadraalphalab/REGOLE-IN-BREVE.md`

**Seconda lettura indipendente**: condotta il 04/11/2026 dal `validatore`. Primo esito: RESPINTO — 4
categorie di correzioni (frase mancante in «Qualità delle prove», contraddizione promozione coordinatore vs CI,
confusione Telegram/WhatsApp, 6 regole non riportate da volty-staging). Secondo esito dopo correzioni:
**APPROVATO** — tutti i punti A–D6 verificati OK. Nota non bloccante (D7): la regola esplicita che le PR
di nuovi sviluppi non possano avere etichetta `tipo:correzione` non è stata aggiunta perché il testo
esistente già la implica (il validatore ha confermato che non è bloccante).
