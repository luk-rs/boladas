import { supabase } from "../../../shared/api/supabase/client";
import type { TeamMembership } from "../../team-scope/types";
import { MIN_TEAM_MEMBERS } from "../../team-scope/constants";
import type { Convocation, ConvocationStatus, PlayerState, VoteEntry } from "../types";

type ServiceResult<T> = {
  data: T;
  error: string | null;
};

export type TeamSchedule = {
  id: string;
  name: string;
  seasonStart: string | null;
  holidayStart: string | null;
  gameDefinitions: unknown;
  memberCount: number;
  isComplete: boolean;
};

function normalizeStatus(value?: string | null): ConvocationStatus {
  if (value === "accepted" || value === "dismissed") {
    return value;
  }
  return "open";
}

export async function listConvocations(
  teamIds: string[],
  teamNameById: Map<string, string>,
  sessionUserId: string | null,
): Promise<ServiceResult<Convocation[]>> {
  if (!supabase || teamIds.length === 0) {
    return { data: [], error: null };
  }

  const nowIso = new Date().toISOString();

  const { data: convocationRows, error: convocationError } = await supabase
    .from("convocations")
    .select("id, team_id, title, scheduled_at, status, team:teams(name)")
    .in("team_id", teamIds)
    .gte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true });

  if (convocationError || !convocationRows) {
    return {
      data: [],
      error: convocationError?.message ?? "Falha ao carregar convocatórias.",
    };
  }

  const convocationIds = convocationRows.map((row) => row.id);
  let voteRows: Array<{
    convocation_id: string;
    user_id: string;
    state: PlayerState;
    updated_at: string;
  }> = [];

  if (convocationIds.length > 0) {
    const { data: votes, error: votesError } = await supabase
      .from("convocation_votes")
      .select("convocation_id, user_id, state, updated_at")
      .in("convocation_id", convocationIds);

    if (votesError) {
      return { data: [], error: votesError.message };
    }
    voteRows = (votes ?? []) as typeof voteRows;
  }

  const userIds = Array.from(new Set(voteRows.map((vote) => vote.user_id)));
  const profileMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", userIds);

    if (profilesError) {
      return { data: [], error: profilesError.message };
    }

    (profilesData ?? []).forEach((profile) => {
      const label = profile.display_name ?? profile.email ?? "Jogador";
      profileMap.set(profile.id, label);
    });
  }

  const voteSummary = new Map<
    string,
    {
      ball: number;
      couch: number;
      hospital: number;
      myState?: PlayerState;
      ballVotes: VoteEntry[];
      couchVotes: VoteEntry[];
      hospitalVotes: VoteEntry[];
    }
  >();

  convocationIds.forEach((id) => {
    voteSummary.set(id, {
      ball: 0,
      couch: 0,
      hospital: 0,
      ballVotes: [],
      couchVotes: [],
      hospitalVotes: [],
    });
  });

  voteRows.forEach((vote) => {
    const entry = voteSummary.get(vote.convocation_id) ?? {
      ball: 0,
      couch: 0,
      hospital: 0,
      ballVotes: [],
      couchVotes: [],
      hospitalVotes: [],
    };

    const label = profileMap.get(vote.user_id) ?? "Jogador";
    const voteEntry = {
      userId: vote.user_id,
      label,
      updatedAt: vote.updated_at,
    };

    if (vote.state === "ball") {
      entry.ball += 1;
      entry.ballVotes.push(voteEntry);
    } else if (vote.state === "couch") {
      entry.couch += 1;
      entry.couchVotes.push(voteEntry);
    } else {
      entry.hospital += 1;
      entry.hospitalVotes.push(voteEntry);
    }

    if (vote.user_id === sessionUserId) {
      entry.myState = vote.state;
    }

    voteSummary.set(vote.convocation_id, entry);
  });

  const statusOrder: Record<ConvocationStatus, number> = {
    open: 0,
    accepted: 1,
    dismissed: 2,
  };

  const mapped = convocationRows
    .map((row) => {
      const teamField = row.team as { name?: string } | { name?: string }[];
      const teamName =
        (Array.isArray(teamField) ? teamField[0]?.name : teamField?.name) ??
        teamNameById.get(row.team_id) ??
        "Equipa";

      const summary = voteSummary.get(row.id) ?? {
        ball: 0,
        couch: 0,
        hospital: 0,
        ballVotes: [],
        couchVotes: [],
        hospitalVotes: [],
      };

      const sortByUpdated = (a: VoteEntry, b: VoteEntry) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();

      const ballVotes = [...summary.ballVotes].sort(sortByUpdated);
      const couchVotes = [...summary.couchVotes].sort(sortByUpdated);
      const hospitalVotes = [...summary.hospitalVotes].sort(sortByUpdated);

      return {
        id: row.id,
        teamId: row.team_id,
        teamName,
        title: row.title ?? null,
        scheduledAt: row.scheduled_at,
        status: normalizeStatus(row.status),
        roster: {
          ball: ballVotes.length,
          couch: couchVotes.length,
          hospital: hospitalVotes.length,
        },
        myState: summary.myState ?? "couch",
        ballVotes,
        couchVotes,
        hospitalVotes,
      } as Convocation;
    })
    .sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });

  return { data: mapped, error: null };
}

export async function updateConvocationVote(
  convocationId: string,
  userId: string,
  nextState: PlayerState,
): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { error } = await supabase
    .from("convocation_votes")
    .update({ state: nextState })
    .eq("convocation_id", convocationId)
    .eq("user_id", userId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function setConvocationStatus(
  convocationId: string,
  status: ConvocationStatus,
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

export async function createConvocation(payload: {
  teamId: string;
  title: string;
  scheduledAtIso: string;
  gameDefinitionKey: string;
}): Promise<ServiceResult<null>> {
  if (!supabase) {
    return { data: null, error: "Cliente Supabase indisponível." };
  }

  const { error } = await supabase.rpc("create_convocation", {
    p_team_id: payload.teamId,
    p_title: payload.title,
    p_scheduled_at: payload.scheduledAtIso,
    p_game_definition_key: payload.gameDefinitionKey,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

export async function listTeamSchedules(
  manageableMemberships: TeamMembership[],
): Promise<ServiceResult<Record<string, TeamSchedule>>> {
  if (!supabase || manageableMemberships.length === 0) {
    return { data: {}, error: null };
  }

  const teamIds = manageableMemberships.map((membership) => membership.teamId);

  let rows:
    | Array<{
        id: string;
        name: string;
        season_start?: string | null;
        holiday_start?: string | null;
        game_definitions?: unknown;
      }>
    | null = null;

  let fetchError: string | null = null;
  let memberRows: Array<{ team_id: string }> = [];

  const { data: fullData, error: fullError } = await supabase
    .from("teams")
    .select("id, name, season_start, holiday_start, game_definitions")
    .in("id", teamIds);

  if (fullError) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds);

    if (fallbackError) {
      fetchError = fallbackError.message;
    } else {
      rows = (fallbackData ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        season_start: null,
        holiday_start: null,
        game_definitions: [],
      }));
    }
  } else {
    rows = fullData ?? [];
  }

  const { data: membersData, error: membersError } = await supabase
    .from("team_members")
    .select("team_id")
    .in("team_id", teamIds);

  if (membersError) {
    fetchError = fetchError ?? membersError.message;
  } else {
    memberRows = membersData ?? [];
  }

  if (fetchError) {
    return { data: {}, error: fetchError };
  }

  const byId: Record<string, TeamSchedule> = {};
  const memberCountByTeamId = new Map<string, number>();

  teamIds.forEach((teamId) => memberCountByTeamId.set(teamId, 0));
  memberRows.forEach((row) => {
    memberCountByTeamId.set(
      row.team_id,
      (memberCountByTeamId.get(row.team_id) ?? 0) + 1,
    );
  });

  manageableMemberships.forEach((membership) => {
    const row = rows?.find((candidate) => candidate.id === membership.teamId);
    const memberCount = memberCountByTeamId.get(membership.teamId) ?? 0;

    byId[membership.teamId] = {
      id: membership.teamId,
      name: row?.name ?? membership.teamName,
      seasonStart: row?.season_start ?? null,
      holidayStart: row?.holiday_start ?? null,
      gameDefinitions: row?.game_definitions ?? [],
      memberCount,
      isComplete: memberCount >= MIN_TEAM_MEMBERS,
    };
  });

  return { data: byId, error: null };
}
