import { HTTPException } from "hono/http-exception";

import { createRouter, dbMiddleware, registerErrorHandling } from "./lib/app";
import { authMiddleware } from "./lib/auth";
import { auctionRoutes } from "./routes/auction";
import { authRoutes } from "./routes/auth";
import { invitationsRoutes } from "./routes/invitations";
import { leaguesRoutes } from "./routes/leagues";
import { organizationsRoutes } from "./routes/organizations";
import { playersRoutes } from "./routes/players";
import { recommendationsRoutes } from "./routes/recommendations";
import { teamsRoutes } from "./routes/teams";

const app = createRouter();

// Per ogni richiesta API: istanzia il DB e aggancia l'eventuale utente.
app.use("/api/*", dbMiddleware);
app.use("/api/*", authMiddleware);

// Guardia di autenticazione: tutto sotto /api richiede login tranne l'health
// check e le rotte di autenticazione stesse.
app.use("/api/*", async (c, next) => {
  const path = c.req.path;
  const isPublic = path === "/api/health" || path.startsWith("/api/auth/");
  if (!isPublic && !c.get("user")) {
    throw new HTTPException(401, { message: "Autenticazione richiesta" });
  }
  await next();
});

app.get("/api/health", (c) =>
  c.json({
    status: "ok",
    service: "FantaFriend API",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  }),
);

app.route("/api/auth", authRoutes);
app.route("/api/organizations", organizationsRoutes);
app.route("/api/leagues", leaguesRoutes);
app.route("/api/players", playersRoutes);
// Rotte con prefissi misti (es. /api/leagues/:leagueId/teams e /api/teams/:id).
app.route("/api", teamsRoutes);
app.route("/api", auctionRoutes);
app.route("/api", invitationsRoutes);
app.route("/api", recommendationsRoutes);

registerErrorHandling(app);

export default app;
