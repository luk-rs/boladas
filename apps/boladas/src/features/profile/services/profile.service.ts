import { supabase } from "../../../shared/api/supabase/client";

type ServiceResult<T> = {
  data: T;
  error: string | null;
};

export type HeaderStats = {
  games: number;
  confirmed: number;
  unavailable: number;
  teams: number;
  attendanceRate: number;
  upcomingGames: number;
  pendingCouch: number;
  hasGameToday: boolean;
  hasPendingCouchToday: boolean;
  hasPendingCouchYesterday: boolean;
};

type VoteState = "ball" | "couch" | "hospital";

export const EMPTY_STATS: HeaderStats = {
  games: 0,
  confirmed: 0,
  unavailable: 0,
  teams: 0,
  attendanceRate: 0,
  upcomingGames: 0,
  pendingCouch: 0,
  hasGameToday: false,
  hasPendingCouchToday: false,
  hasPendingCouchYesterday: false,
};

function getDayDiffFromToday(isoDate: string, todayStart: Date) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;

  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((dateStart.getTime() - todayStart.getTime()) / msPerDay);
}

export async function loadProfileHeaderData(payload: {
  sessionUserId: string | null;
  sessionEmail: string | null;
  teamIds: string[];
}): Promise<
  ServiceResult<{
    displayName: string;
    stats: HeaderStats;
  }>
> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();
  const teamCount = payload.teamIds.length;

  if (!supabase || !payload.sessionUserId) {
    return {
      data: {
        displayName: payload.sessionEmail ?? "Jogador",
        stats: { ...EMPTY_STATS, teams: teamCount },
      },
      error: null,
    };
  }

  const [profileResult, votesResult, upcomingResult, couchVotesResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", payload.sessionUserId)
        .maybeSingle(),
      supabase
        .from("convocation_votes")
        .select("state")
        .eq("user_id", payload.sessionUserId),
      teamCount > 0
        ? supabase
            .from("convocations")
            .select("id, scheduled_at")
            .in("team_id", payload.teamIds)
            .gte("scheduled_at", todayStartIso)
            .in("status", ["open", "accepted"])
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("convocation_votes")
        .select("convocation:convocations(status,scheduled_at)")
        .eq("user_id", payload.sessionUserId)
        .eq("state", "couch"),
    ]);

  if (profileResult.error) {
    return {
      data: {
        displayName: payload.sessionEmail ?? "Jogador",
        stats: { ...EMPTY_STATS, teams: teamCount },
      },
      error: profileResult.error.message,
    };
  }

  const votes = (votesResult.data ?? []) as Array<{ state: VoteState }>;
  const upcomingRows = (upcomingResult.data ?? []) as Array<{
    scheduled_at?: string | null;
  }>;
  const couchVotes = (couchVotesResult.data ?? []) as Array<{
    convocation:
      | { status?: string | null; scheduled_at?: string | null }
      | { status?: string | null; scheduled_at?: string | null }[]
      | null;
  }>;

  const games = votes.length;
  const confirmed = votes.filter((vote) => vote.state === "ball").length;
  const unavailable = votes.filter((vote) => vote.state === "hospital").length;
  const attendanceRate = games > 0 ? Math.round((confirmed / games) * 100) : 0;
  const upcomingGames = upcomingRows.length;
  const hasGameToday = upcomingRows.some((row) => {
    if (!row.scheduled_at) return false;
    return getDayDiffFromToday(row.scheduled_at, todayStart) === 0;
  });

  const openCouchConvocations = couchVotes
    .map((row) =>
      Array.isArray(row.convocation) ? row.convocation[0] : row.convocation,
    )
    .filter(
      (convocation): convocation is { status?: string | null; scheduled_at: string } =>
        Boolean(convocation?.scheduled_at) && convocation?.status === "open",
    );

  const pendingCouch = openCouchConvocations.length;
  const hasPendingCouchToday = openCouchConvocations.some(
    (convocation) =>
      getDayDiffFromToday(convocation.scheduled_at, todayStart) === 0,
  );
  const hasPendingCouchYesterday = openCouchConvocations.some(
    (convocation) =>
      getDayDiffFromToday(convocation.scheduled_at, todayStart) === -1,
  );

  return {
    data: {
      displayName:
        profileResult.data?.display_name?.trim() ||
        payload.sessionEmail ||
        "Jogador",
      stats: {
        games,
        confirmed,
        unavailable,
        teams: teamCount,
        attendanceRate,
        upcomingGames,
        pendingCouch,
        hasGameToday,
        hasPendingCouchToday,
        hasPendingCouchYesterday,
      },
    },
    error: votesResult.error?.message ?? upcomingResult.error?.message ?? couchVotesResult.error?.message ?? null,
  };
}
