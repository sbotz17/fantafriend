// Estende l'interfaccia Env generata da Wrangler con i binding/secret del
// progetto. In sviluppo DATABASE_URL va messa in `.dev.vars`; in produzione
// si imposta come secret con `wrangler secret put DATABASE_URL`.
interface Env {
  DATABASE_URL: string;
  // Binding agli asset statici (SPA): usato per servire index.html sulle rotte
  // lato client (fallback single-page-application).
  ASSETS: Fetcher;
}
