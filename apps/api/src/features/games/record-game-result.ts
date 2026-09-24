import type postgres from "postgres";
import { authenticateRequest, withUserContext } from "../../shared/auth";
import { closeDb, getDb } from "../../shared/db";
import { jsonError, jsonResponse } from "../../shared/http";
import type { Env } from "../../index";
import { mapGame, parseGameId, parseResultBody, type GameRow } from "./types";

type Sql = ReturnType<typeof postgres>;

export async function handleRecordGameResult(
  request: Request,
  env: Env,
  gameId: string,
): Promise<Response> {
  if (request.method !== "PUT") {
    return jsonError(405, "Method not allowed", env.ALLOWED_ORIGIN);
  }

  if (!env.SUPABASE_DB_URL) {
    return jsonError(500, "Missing DB configuration", env.ALLOWED_ORIGIN);
  }

  const parsedId = parseGameId(gameId);
  if (!parsedId) {
    return jsonError(400, "Invalid game id", env.ALLOWED_ORIGIN);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Request body must be JSON", env.ALLOWED_ORIGIN);
  }

  const parsed = parseResultBody(body);
  if (!parsed.ok) {
    return jsonError(400, parsed.error, env.ALLOWED_ORIGIN);
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

    const game = await withUserContext(getSql(), auth.userId, async (tx) => {
      const rows = await tx<{ game: GameRow | string | null }[]>`
        select public.record_game_result(
          ${parsedId}::uuid,
          ${parsed.shirtsScore}::integer,
          ${parsed.coletesScore}::integer
        ) as game
      `;
      return asGameRow(rows[0]?.game);
    });

    if (!game) {
      return jsonError(404, "Game not found", env.ALLOWED_ORIGIN);
    }

    return jsonResponse(mapGame(game), 200, env.ALLOWED_ORIGIN);
  } catch (error: unknown) {
    const mapped = mapWriteError(error);
    if (mapped) {
      return jsonError(mapped.status, mapped.error, env.ALLOWED_ORIGIN);
    }
    console.error("Database Error:", error);
    return jsonError(500, "Failed to record game result", env.ALLOWED_ORIGIN);
  } finally {
    if (sql) await closeDb(sql);
  }
}

function asGameRow(value: GameRow | string | null | undefined): GameRow | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as GameRow;
    } catch {
      return null;
    }
  }
  return value;
}

function mapWriteError(
  error: unknown,
): { status: number; error: string } | null {
  if (!error || typeof error !== "object") return null;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  if (code === "P0002" || message.includes("Game not found")) {
    return { status: 404, error: "Game not found" };
  }
  if (
    code === "42501" ||
    message.includes("Not authorized to record game result")
  ) {
    return { status: 403, error: "Not authorized to record game result" };
  }
  if (
    code === "22023" ||
    code === "22003" ||
    code === "22P02" ||
    message.includes("Scores must be non-negative integers")
  ) {
    return { status: 400, error: "Scores must be non-negative integers" };
  }
  if (code === "28000" || message.includes("Not authenticated")) {
    return { status: 401, error: "Invalid access token" };
  }
  return null;
}
