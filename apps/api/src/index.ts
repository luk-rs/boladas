import { Hono } from "hono";
import { cors } from "hono/cors";
import { handleRandom } from "./features/random";
import { handleGetGames } from "./features/games/get-games";
import { handleRecordGameResult } from "./features/games/record-game-result";
import { handleGetConvocationTeams } from "./features/convocations/get-convocation-teams";

export interface Env {
  ALLOWED_ORIGIN?: string;
  SUPABASE_DB_URL?: string;
  /** HS256 secret for Supabase access tokens. Optional when the database setting or Auth API is configured. */
  SUPABASE_JWT_SECRET?: string;
  /** Supabase project URL. Used with SUPABASE_ANON_KEY to validate access tokens via GoTrue. */
  SUPABASE_URL?: string;
  /** Supabase anon key. Public client key, sent as the apikey header when validating tokens. */
  SUPABASE_ANON_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>({ strict: false });

// Enable CORS for all routes
app.use(
  "*",
  cors({
    origin: (origin, c) => c.env.ALLOWED_ORIGIN || "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/random", (c) => {
  return handleRandom(c.req.raw, c.env.ALLOWED_ORIGIN);
});

app.get("/games", (c) => {
  return handleGetGames(c.req.raw, c.env);
});

app.put("/games/:id/result", (c) => {
  return handleRecordGameResult(c.req.raw, c.env, c.req.param("id"));
});

app.get("/convocations/:id/teams", (c) => {
  const id = c.req.param("id");
  return handleGetConvocationTeams(c.req.raw, c.env, id, c.env.ALLOWED_ORIGIN);
});

export default app;
