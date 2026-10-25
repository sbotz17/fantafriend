# Registro decisioni — Fantafriend

## 2026-10-26 — Strumenti della squadra
- **Decisione**: aggiunti `.claude/agents`, `.claude/commands`, `.opencode/agents`, `.opencode/commands` e
  `opencode.jsonc`. I ruoli e i comandi sono gli stessi nei due strumenti; cambia solo il formato e il modello
  (DeepSeek Flash per analisi, UI, test e report; DeepSeek V4 Pro per architettura, dati, backend,
  validazione, bug e produzione).
- **Perché**: la squadra sviluppa sia da Claude Code sia da OpenCode; prima c'erano solo le skill.
- **Verifica**: `opencode debug agents`, frontmatter YAML valido, seconda lettura indipendente.
- **In sospeso**: task in Avanza non creato (`importa-task` assente sul ramo `main`); nessun codice `T-N`.
