---
description: "Prepara e verifica un rilascio"
agent: coordinatore
---

Segui `AGENTS.md` (o `CLAUDE.md`) e la skill `squadra-rilascio`.

1. `guardiano-produzione` compila la checklist e da' GO/NO-GO.
2. Verifica APPROVATO del validatore, accettazione indipendente, backup verificato, rollback, controlli verdi.
3. Il deploy lo fa la CI o il comando documentato in `docs/progetto/ambienti.md`; gli agenti non usano
   credenziali di produzione e non fanno deploy manuali.
4. Nel dubbio: NO-GO, decisione in sospeso e avviso ad Andrea.
5. Dopo il rilascio: verifica e prova del sito.
