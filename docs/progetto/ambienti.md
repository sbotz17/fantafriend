# Ambienti — Fantafriend

- **Rami**: `main` (produzione); si lavora su rami `feature/`, `fix/`, `hotfix/` con pull request.
- **Test**: `npm run lint`, `npm run build`; nessuna suite di test.
- **Produzione**: `npm run deploy` (Wrangler) sul dominio di produzione; nessun ambiente di test separato.
- **Dati**: Neon PostgreSQL con Drizzle; migrazioni in `drizzle/`.
- **Backup**: backup PostgreSQL verificato; nessuno script unico nel repository.

Regole: nessuna modifica diretta alla produzione; PR e controlli prima del rilascio. Se un ambiente di test
separato non esiste, va creato solo con una decisione di Andrea (account e costi).
