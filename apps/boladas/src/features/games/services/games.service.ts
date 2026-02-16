import { supabase } from "../../../shared/api/supabase/client";
import type { UpcomingGame } from "../types";

type ServiceResult<T> = {
  data: T;
  error: string | null;
};

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
  teamIds: string[],
  teamNameById: Map<string, string>,
  sessionUserId: string | null,
): Promise<ServiceResult<UpcomingGame[]>> {
  if (!supabase || teamIds.length === 0) {
    return { data: [], error: null };
  }

  const nowIso = new Date().toISOString();
  const { data: gameRows, error } = await supabase
    .from("games")
    .select(
      "id, convocation_id, team_id, scheduled_at, created_at, shirts_lineup, coletes_lineup, team:teams(name)",
    )
    .in("team_id", teamIds)
    .gte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true });

  if (error || !gameRows) {
    return { data: [], error: error?.message ?? "Falha ao carregar jogos." };
  }

  const toEmojiStack = (
    lineup: unknown,
    keyPrefix: string,
  ): Array<{ id: string; label: string; isSelf: boolean }> => {
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
      .sort((a, b) => a.slot - b.slot)
      .map(({ slot: _, ...item }) => item);
  };

  const mapped = gameRows.map((row) => {
    const teamField = row.team as { name?: string } | { name?: string }[];
    const teamName =
      (Array.isArray(teamField) ? teamField[0]?.name : teamField?.name) ??
      teamNameById.get(row.team_id) ??
      "Equipa";

    return {
      id: row.id,
      convocationId: row.convocation_id,
      teamId: row.team_id,
      teamName,
      scheduledAt: row.scheduled_at,
      createdAt: row.created_at,
      shirtsLineup: toEmojiStack(row.shirts_lineup, `${row.id}-shirts`),
      coletesLineup: toEmojiStack(row.coletes_lineup, `${row.id}-coletes`),
    } as UpcomingGame;
  });

  return { data: mapped, error: null };
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
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
  const response = await fetch(
    `${apiUrl.replace(/\/$/, "")}/convocations/${convocationId}/teams`,
  );

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
