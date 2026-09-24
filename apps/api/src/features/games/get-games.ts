import type postgres from "postgres";
import { authenticateRequest, withUserContext } from "../../shared/auth";
import { closeDb, getDb } from "../../shared/db";
import { jsonError, jsonResponse } from "../../shared/http";
import type { Env } from "../../index";
import { mapGame, type GameRow } from "./types";

type Sql = ReturnType<typeof postgres>;

export async function handleGetGames(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonError(405, "Method not allowed", env.ALLOWED_ORIGIN);
  }

  if (!env.SUPABASE_DB_URL) {
    return jsonError(500, "Missing DB configuration", env.ALLOWED_ORIGIN);
  }

  const dbUrl = env.SUPABASE_DB_URL;
  let sql: Sql | null = null;
  const getSql = () => {
    if (!sql) sql = getDb(dbUrl);
    return sql;
  };

  try {
    const auth = await authenticateRequest(request, env, getSql);
    if (auth instanceof Response) return auth;

    const games = await withUserContext(getSql(), auth.userId, async (tx) => {
      const rows = await tx<GameRow[]>`
        select * from public.list_visible_games()
      `;
      return rows.map(mapGame);
    });

    return jsonResponse({ games }, 200, env.ALLOWED_ORIGIN);
  } catch (error: unknown) {
    console.error("Database Error:", error);
    return jsonError(500, "Failed to load games", env.ALLOWED_ORIGIN);
  } finally {
    if (sql) await closeDb(sql);
  }
}
