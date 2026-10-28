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
