import type { EmojiStackItem } from "../../team-scope/components/EmojiStack";
import { supabase } from "../../../shared/api/supabase/client";
import type { Game, GameResultScores, GameStatus } from "../types";

type ServiceResult<T> = {
  data: T;
  error: string | null;
};

type ApiGame = {
  id?: string;
  convocationId?: string | null;
  teamId?: string;
  teamName?: string;
  scheduledAt?: string;
  createdAt?: string;
  status?: GameStatus;
  shirtsScore?: number | null;
  coletesScore?: number | null;
  completedAt?: string | null;
  shirtsLineup?: unknown;
  coletesLineup?: unknown;
  canRecordResult?: boolean;
};

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL || "http://localhost:8787";
  return `${base.replace(/\/$/, "")}${path}`;
}

async function authorizedHeaders(): Promise<
  { ok: true; headers: HeadersInit } | { ok: false; error: string }
> {
  if (!supabase) {
    return { ok: false, error: "Cliente Supabase indisponível." };
  }

  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    return { ok: false, error: "Sessão em falta. Inicia sessão outra vez." };
  }

  return {
    ok: true,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function asScore(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function toEmojiStack(
  lineup: unknown,
  keyPrefix: string,
  sessionUserId: string | null,
): EmojiStackItem[] {
  if (!Array.isArray(lineup)) return [];

  return lineup
    .map((entry, index) => {
      const player = entry as {
        id?: string;
        name?: string;
        slot?: number;
      };
      const playerId = player.id ?? `${keyPrefix}-${index}`;
      const label = player.name ?? "Jogador";
      const slotValue = Number(player.slot);

      return {
        id: `${keyPrefix}-${playerId}`,
        label,
        isSelf: player.id === sessionUserId,
        slot: Number.isNaN(slotValue) ? index + 1 : slotValue,
      };
    })
    .sort((left, right) => left.slot - right.slot)
    .map(({ slot: _slot, ...item }) => item);
}

function mapApiGame(value: unknown, sessionUserId: string | null): Game | null {
  if (!value || typeof value !== "object") return null;
  const row = value as ApiGame;
  if (typeof row.id !== "string" || typeof row.teamId !== "string") return null;

  return {
    id: row.id,
    convocationId: typeof row.convocationId === "string" ? row.convocationId : null,
    teamId: row.teamId,
    teamName:
      typeof row.teamName === "string" && row.teamName.trim()
        ? row.teamName
        : "Equipa",
    scheduledAt: typeof row.scheduledAt === "string" ? row.scheduledAt : "",
    createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
    status: row.status === "completed" ? "completed" : "scheduled",
    shirtsScore: asScore(row.shirtsScore),
    coletesScore: asScore(row.coletesScore),
    completedAt: typeof row.completedAt === "string" ? row.completedAt : null,
    shirtsLineup: toEmojiStack(row.shirtsLineup, `${row.id}-shirts`, sessionUserId),
    coletesLineup: toEmojiStack(row.coletesLineup, `${row.id}-coletes`, sessionUserId),
    canRecordResult: row.canRecordResult === true,
  };
}

export type LineupPlayer = {
  id: string;
  name: string;
  slot: number;
  isGuest: boolean;
};

export type TeamsResponse = {
  convocationId: string;
  teamName: string;
  scheduledAt: string;
  teams: {
    shirts: Array<{ id: string; name: string }>;
    coletes: Array<{ id: string; name: string }>;
  };
};

export async function listGames(
  sessionUserId: string | null,
): Promise<ServiceResult<Game[]>> {
  const auth = await authorizedHeaders();
  if (!auth.ok) {
    return { data: [], error: auth.error };
  }

  let response: Response;
  try {
    response = await fetch(apiUrl("/games"), { headers: auth.headers });
  } catch {
    return { data: [], error: "Falha ao carregar jogos." };
  }

  if (!response.ok) {
    return {
      data: [],
      error: await readApiError(response, "Falha ao carregar jogos."),
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { data: [], error: "Falha ao carregar jogos." };
  }

  const games = (payload as { games?: unknown }).games;
  if (!Array.isArray(games)) {
    return { data: [], error: "Falha ao carregar jogos." };
  }

  return {
    data: games.flatMap((game) => {
      const mapped = mapApiGame(game, sessionUserId);
      return mapped ? [mapped] : [];
    }),
    error: null,
  };
}

export async function recordGameResult(
  gameId: string,
  scores: GameResultScores,
  sessionUserId: string | null,
): Promise<ServiceResult<Game | null>> {
  const auth = await authorizedHeaders();
  if (!auth.ok) {
    return { data: null, error: auth.error };
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(`/games/${encodeURIComponent(gameId)}/result`), {
      method: "PUT",
      headers: auth.headers,
      body: JSON.stringify({
        shirtsScore: scores.shirtsScore,
        coletesScore: scores.coletesScore,
      }),
    });
  } catch {
    return { data: null, error: "Falha ao registar resultado." };
  }

  if (!response.ok) {
    return {
      data: null,
      error: await readApiError(response, "Falha ao registar resultado."),
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { data: null, error: "Falha ao registar resultado." };
  }

  const game = mapApiGame(payload, sessionUserId);
  if (!game) {
    return { data: null, error: "Falha ao registar resultado." };
  }

  return { data: game, error: null };
}

export async function cancelGameFromConvocation(
  convocationId: string,
): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { error } = await supabase.rpc("cancel_game_from_convocation", {
    p_convocation_id: convocationId,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function getConvocationStatus(
  convocationId: string,
): Promise<ServiceResult<"open" | "accepted" | "dismissed" | null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { data, error } = await supabase
    .from("convocations")
    .select("status")
    .eq("id", convocationId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data?.status ?? "open") as "open" | "accepted" | "dismissed",
    error: null,
  };
}

export async function setConvocationStatus(
  convocationId: string,
  status: "open" | "accepted" | "dismissed",
): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { error } = await supabase.rpc("set_convocation_status", {
    p_convocation_id: convocationId,
    p_status: status,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function createGameFromConvocationWithTeams(payload: {
  convocationId: string;
  scheduledAtIso: string | null;
  shirts: LineupPlayer[];
  coletes: LineupPlayer[];
}): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { error } = await supabase.rpc(
    "create_game_from_convocation_with_teams",
    {
      p_convocation_id: payload.convocationId,
      p_scheduled_at: payload.scheduledAtIso,
      p_shirts: payload.shirts,
      p_coletes: payload.coletes,
    },
  );

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function createGameFromConvocationLegacy(payload: {
  convocationId: string;
  scheduledAtIso: string | null;
}): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { error } = await supabase.rpc("create_game_from_convocation", {
    p_convocation_id: payload.convocationId,
    p_scheduled_at: payload.scheduledAtIso,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function fetchConvocationTeams(
  convocationId: string,
): Promise<ServiceResult<TeamsResponse>> {
  const response = await fetch(apiUrl(`/convocations/${convocationId}/teams`));

  if (!response.ok) {
    return {
      data: {
        convocationId,
        teamName: "Equipa",
        scheduledAt: new Date().toISOString(),
        teams: { shirts: [], coletes: [] },
      },
      error: `Erro da API: ${response.status}`,
    };
  }

  const data = (await response.json()) as TeamsResponse;
  return { data, error: null };
}
