# FantaFriend — Estensione Chrome per l'asta

Legge dalla pagina d'asta il **giocatore attualmente chiamato** e l'**offerta
corrente**, li manda a FantaFriend e mostra subito, in un pannello sulla stessa
pagina, la **soglia massima consigliata** e se conviene rilanciare.

## Come funziona

L'estensione non conosce in anticipo la struttura della pagina d'asta: sei tu a
indicarle **con un clic** dove si trovano il nome del giocatore e l'offerta.
Il vantaggio è che continua a funzionare anche se il sito cambia layout — basta
rifare la selezione — e non dipende da riconoscimento ottico, quindi legge il
testo esatto senza errori.

## Installazione

1. Apri Chrome su `chrome://extensions`.
2. Attiva **Modalità sviluppatore** (interruttore in alto a destra).
3. Clicca **Carica estensione non pacchettizzata** e seleziona questa cartella
   (`extension/`).
4. L'icona di FantaFriend compare nella barra degli strumenti.

## Configurazione (una volta sola)

1. **Accedi a FantaFriend** nel browser (es. `https://fantami.it`). Il cookie di
   sessione serve all'estensione per parlare con l'API.
2. Clicca l'icona dell'estensione e compila:
   - **Indirizzo FantaFriend** — `https://fantami.it`, oppure l'URL locale se
     stai lavorando in sviluppo;
   - **Lega** e **la tua squadra** (si caricano da sole dopo l'accesso).
3. Apri la **pagina d'asta**.
4. Sempre dal popup, clicca **"1. Indica il nome del giocatore"**: il popup si
   chiude e il cursore diventa un mirino. Clicca sull'elemento della pagina che
   mostra il nome del giocatore all'asta.
5. Ripeti con **"2. Indica l'offerta corrente"**.

Da questo momento il pannello in basso a destra si aggiorna da solo a ogni
cambio di giocatore o di offerta.

## Insieme alla Sala d'asta

Quello che l'estensione legge viene pubblicato anche in FantaFriend: se tieni
aperta la **Sala d'asta** (`Apri sala d'asta` dalla pagina della lega), i campi
"giocatore chiamato" e "offerta corrente" si compilano da soli, e comparirà
l'indicatore **● in diretta**. Comodo su un secondo schermo, perché lì hai
anche la classifica di chi chiamare e i budget degli avversari.

Il pulsante **Sincronizzato / Manuale** nella Sala d'asta permette di staccarsi
dalla lettura automatica e digitare a mano, per esempio se il riconoscimento
sbaglia o se vuoi simulare un rilancio.

## Cosa mostra il pannello

| Voce | Significato |
| --- | --- |
| **RILANCIA** | L'offerta corrente è sotto il tuo valore: conviene salire. |
| **AL LIMITE** | Sei vicino alla soglia: puoi rilanciare, ma senza margine. |
| **LASCIA** | Oltre la soglia paghi più di quanto valga per te. |
| **NON SERVE** | Hai già completato quel reparto. |
| **Soglia max** | Il massimo che ha senso offrire, considerando valore del giocatore, scarsità del ruolo e budget residuo. |
| **Valore** | Valore di mercato del giocatore riportato al budget della tua lega. |

La soglia tiene sempre conto del vincolo di sostenibilità: lascia **almeno 1
credito per ogni slot ancora da riempire**, così non resti con la rosa
incompleta.

## Se qualcosa non funziona

- **"Non autenticato"** → apri FantaFriend in una scheda e accedi.
- **"Configura lega e squadra"** → completa i due menù a tendina nel popup.
- **Il pannello non si aggiorna** → il sito ha cambiato layout: rifai la
  selezione dei due elementi.
- **"Non riconosciuto nel listone"** → quel giocatore non è nel listone della
  stagione, oppure è già stato assegnato in questa lega.

## Nota

Automatizzare la lettura di piattaforme di terze parti può violarne i termini di
servizio. L'estensione lavora **solo in locale sul tuo browser**, sulla pagina
che stai già guardando, e non accede ai server della piattaforma: valuta
comunque tu se l'uso è consentito nel tuo contesto.
