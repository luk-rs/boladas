import { Hono } from "hono";
import { cors } from "hono/cors";
import { handleRandom } from "./features/random";
import { handleGetGames } from "./features/games/get-games";
import { handleGetConvocationTeams } from "./features/convocations/get-convocation-teams";

export interface Env {
  ALLOWED_ORIGIN?: string;
  SUPABASE_DB_URL?: string;
}

const app = new Hono<{ Bindings: Env }>({ strict: false });

// Enable CORS for all routes
app.use("*", async (c, next) => {
  const origin = c.env.ALLOWED_ORIGIN || "*";
  const corsMiddleware = cors({
    origin,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  });
  return corsMiddleware(c, next);
});

app.get("/random", (c) => {
  return handleRandom(c.req.raw, c.env.ALLOWED_ORIGIN);
});

app.get("/games", (c) => {
  return handleGetGames(c.req.raw, c.env);
});

app.get("/convocations/:id/teams", (c) => {
  const id = c.req.param("id");
  return handleGetConvocationTeams(c.req.raw, c.env, id, c.env.ALLOWED_ORIGIN);
});

export default app;
