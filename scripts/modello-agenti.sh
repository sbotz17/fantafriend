#!/usr/bin/env bash
# Gestisce il modello degli agenti di test e controllo (i "gratuiti"), senza toccare
# gli agenti di sviluppo che restano a pagamento.
#
#   ./scripts/modello-agenti.sh stato      mostra il modello di ogni agente
#   ./scripts/modello-agenti.sh gratis     rimette gli agenti gratuiti (predefinito)
#   ./scripts/modello-agenti.sh ripiego    porta gli agenti gratuiti su deepseek/deepseek-flash#high
#
# Motivo: se il modello gratuito e' occupato o va in limite d'uso, si passa al ripiego
# a pagamento (flash#high, non #low: la differenza di prezzo e' ~0,2 centesimi, quella
# di qualita' no). Vedi DECISIONI.md, voce 2026-10-30.
#
# Questo file arriva in ogni progetto con la sincronizzazione delle regole: non va
# personalizzato per progetto. La copia globale e' ~/.config/opencode/scripts/modello-agenti.sh.
set -euo pipefail

QUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Funziona da qualunque cartella del progetto: prima accanto allo script,
# poi nella cartella corrente.
if [[ -d "$QUI/../.opencode/agents" ]]; then
  DIR_AGENTI="$(cd "$QUI/../.opencode/agents" && pwd)"
elif [[ -d "${PWD}/.opencode/agents" ]]; then
  DIR_AGENTI="${PWD}/.opencode/agents"
else
  echo "Nessuna cartella .opencode/agents trovata in questo progetto: non ci sono agenti da cambiare." >&2
  echo "Per questo progetto si cambia a mano la riga 'model:' del file dell'agente." >&2
  exit 3
fi

# Agenti liberi: nome -> variante da usare quando sono gratuiti.
GRATUITI_HIGH=(coordinatore analista designer-frontend tester)
GRATUITI_LOW=(gestore-ritorni redattore-manuale marketing)

MODELLO_GRATIS="opencode/deepseek-v4.1-flash-free"
MODELLO_RIPIEGO="deepseek/deepseek-flash#high"

# Agenti che devono restare a pagamento: se qualcuno li mette su un modello gratuito, lo segnaliamo.
A_PAGAMENTO=(architetto dba guardiano-produzione revisore-sicurezza risolutore-bug sviluppatore-backend sviluppatore-frontend validatore)

metti_modello() {
  local agente="$1" modello="$2" file="$DIR_AGENTI/$1.md"
  if [[ ! -f "$file" ]]; then
    echo "ERRORE: agente non trovato: $file" >&2
    return 1
  fi
  if ! grep -q '^model:' "$file"; then
    echo "ERRORE: $agente.md non ha la riga 'model:'" >&2
    return 1
  fi
  # macOS (BSD sed) e Linux (GNU sed) si comportano diversamente con -i.
  if sed --version >/dev/null 2>&1; then
    sed -i "s|^model: .*$|model: $modello|" "$file"
  else
    sed -i '' "s|^model: .*$|model: $modello|" "$file"
  fi
}

# Controlla che i file esistano PRIMA di scrivere: se manca qualcosa non si tocca niente.
controlla_files() {
  local agente mancante=0
  for agente in "$@"; do
    if [[ ! -f "$DIR_AGENTI/$agente.md" ]]; then
      echo "ERRORE: manca il file dell'agente $agente.md in $DIR_AGENTI: non cambio nessun modello." >&2
      mancante=1
    fi
  done
  return $mancante
}

azione="${1:-stato}"

case "$azione" in
  stato)
    printf '%-24s %s\n' "AGENTE" "MODELLO"
    shopt -s nullglob
    for f in "$DIR_AGENTI"/*.md; do
      agente="$(basename "$f" .md)"
      modello="$(grep -m1 '^model:' "$f" 2>/dev/null | sed 's/^model: *//' || true)"
      [[ -n "$modello" ]] || modello="(nessuna riga model:)"
      printf '%-24s %s\n' "$agente" "$modello"
    done
    echo
    for agente in "${A_PAGAMENTO[@]}"; do
      [[ -f "$DIR_AGENTI/$agente.md" ]] || continue
      modello="$(grep -m1 '^model:' "$DIR_AGENTI/$agente.md" | sed 's/^model: *//' || true)"
      case "$modello" in
        *free*)
          echo "ATTENZIONE: $agente e' su un modello gratuito ($modello) ma deve restare a pagamento."
          ;;
      esac
    done
    ;;
  gratis)
    controlla_files "${GRATUITI_HIGH[@]}" "${GRATUITI_LOW[@]}" || exit 1
    for agente in "${GRATUITI_HIGH[@]}"; do
      metti_modello "$agente" "$MODELLO_GRATIS#high"
    done
    for agente in "${GRATUITI_LOW[@]}"; do
      metti_modello "$agente" "$MODELLO_GRATIS#low"
    done
    echo "Agenti di test e controllo riportati sul modello gratuito."
    ;;
  ripiego)
    controlla_files "${GRATUITI_HIGH[@]}" "${GRATUITI_LOW[@]}" || exit 1
    for agente in "${GRATUITI_HIGH[@]}" "${GRATUITI_LOW[@]}"; do
      metti_modello "$agente" "$MODELLO_RIPIEGO"
    done
    echo "Agenti di test e controllo portati sul ripiego a pagamento ($MODELLO_RIPIEGO)."
    ;;
  *)
    echo "Uso: $0 [stato|gratis|ripiego]" >&2
    exit 2
    ;;
esac
