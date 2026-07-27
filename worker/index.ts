import { createRouter, dbMiddleware, registerErrorHandling } from "./lib/app";
import { auctionRoutes } from "./routes/auction";
import { leaguesRoutes } from "./routes/leagues";
import { organizationsRoutes } from "./routes/organizations";
import { playersRoutes } from "./routes/players";
import { teamsRoutes } from "./routes/teams";

const app = createRouter();

// Istanzia il database per tutte le richieste API.
app.use("/api/*", dbMiddleware);

app.get("/api/health", (c) =>
  c.json({
    status: "ok",
    service: "FantaFriend API",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  }),
);

app.route("/api/organizations", organizationsRoutes);
app.route("/api/leagues", leaguesRoutes);
app.route("/api/players", playersRoutes);
// Rotte con prefissi misti (es. /api/leagues/:leagueId/teams e /api/teams/:id).
app.route("/api", teamsRoutes);
app.route("/api", auctionRoutes);

registerErrorHandling(app);

export default app;
