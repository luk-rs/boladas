import { supabase } from "../../../shared/api/supabase/client";

type ServiceResult<T> = {
  data: T;
  error: string | null;
};

export type FormMatch = {
  id: string;
  symbol: string;
  label: string;
  className: string;
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
  wins: number;
  winRate: number;
  completedGamesPlayed: number;
  recentForm: FormMatch[];
};

type VoteState = "ball" | "couch" | "hospital";

const DEFAULT_FORM: FormMatch[] = Array.from({ length: 5 }, (_, i) => ({
  id: `default-${i}`,
  symbol: "◌",
  label: `Jogo ${i + 1}: por disputar`,
  className:
    "bg-transparent text-slate-300 ring-1 ring-slate-300 dark:text-slate-400 dark:ring-slate-500",
}));

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
  wins: 0,
  winRate: 0,
  completedGamesPlayed: 0,
  recentForm: DEFAULT_FORM,
};

function getDayDiffFromToday(isoDate: string, todayStart: Date) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;

  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((dateStart.getTime() - todayStart.getTime()) / msPerDay);
}

type CompletedGameRow = {
  id: string;
  status: string;
  shirts_score: number | null;
  coletes_score: number | null;
  shirts_lineup: Array<{ id?: string; name?: string }> | null;
  coletes_lineup: Array<{ id?: string; name?: string }> | null;
  scheduled_at: string | null;
  completed_at: string | null;
};

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

  const [profileResult, votesResult, upcomingResult, couchVotesResult, completedGamesResult] =
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
      teamCount > 0
        ? supabase
            .from("games")
            .select(
              "id, status, shirts_score, coletes_score, shirts_lineup, coletes_lineup, scheduled_at, completed_at",
            )
            .in("team_id", payload.teamIds)
            .eq("status", "completed")
            .order("scheduled_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
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
  const completedGames = (completedGamesResult.data ?? []) as CompletedGameRow[];

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

  // Compute real match outcome statistics and rolling form
  let wins = 0;
  let completedGamesPlayed = 0;
  const recentFormList: FormMatch[] = [];

  for (const game of completedGames) {
    if (game.shirts_score === null || game.coletes_score === null) continue;

    const inShirts = (game.shirts_lineup ?? []).some(
      (p) => p.id === payload.sessionUserId,
    );
    const inColetes = (game.coletes_lineup ?? []).some(
      (p) => p.id === payload.sessionUserId,
    );

    if (!inShirts && !inColetes) continue;

    completedGamesPlayed += 1;
    const shirtsScore = game.shirts_score;
    const coletesScore = game.coletes_score;

    let isWin = false;
    let isDraw = shirtsScore === coletesScore;

    if (inShirts) {
      isWin = shirtsScore > coletesScore;
    } else {
      isWin = coletesScore > shirtsScore;
    }

    if (isWin) {
      wins += 1;
    }

    // Keep the most recent 5 games for form display
    if (recentFormList.length < 5) {
      const myScore = inShirts ? shirtsScore : coletesScore;
      const opScore = inShirts ? coletesScore : shirtsScore;
      const matchIndex = recentFormList.length + 1;

      if (isWin) {
        recentFormList.push({
          id: game.id,
          symbol: "✓",
          label: `Jogo ${matchIndex}: vitória (${myScore}-${opScore})`,
          className: "bg-emerald-500 text-white",
        });
      } else if (isDraw) {
        recentFormList.push({
          id: game.id,
          symbol: "=",
          label: `Jogo ${matchIndex}: empate (${myScore}-${opScore})`,
          className: "bg-slate-500 text-slate-50",
        });
      } else {
        recentFormList.push({
          id: game.id,
          symbol: "×",
          label: `Jogo ${matchIndex}: derrota (${myScore}-${opScore})`,
          className: "bg-red-500 text-white",
        });
      }
    }
  }

  // Pad to 5 if fewer matches played
  while (recentFormList.length < 5) {
    const idx = recentFormList.length + 1;
    recentFormList.push({
      id: `empty-${idx}`,
      symbol: "◌",
      label: `Jogo ${idx}: por disputar`,
      className:
        "bg-transparent text-slate-300 ring-1 ring-slate-300 dark:text-slate-400 dark:ring-slate-500",
    });
  }

  const winRate =
    completedGamesPlayed > 0 ? Math.round((wins / completedGamesPlayed) * 100) : 0;

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
        wins,
        winRate,
        completedGamesPlayed,
        recentForm: recentFormList,
      },
    },
    error:
      votesResult.error?.message ??
      upcomingResult.error?.message ??
      couchVotesResult.error?.message ??
      completedGamesResult.error?.message ??
      null,
  };
}
