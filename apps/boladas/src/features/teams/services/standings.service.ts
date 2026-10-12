import { supabase } from "../../../shared/api/supabase/client";

export type PlayerStanding = {
  playerId: string;
  playerName: string;
  isGuest: boolean;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  winRate: number;
};

export type StandingsSummary = {
  standings: PlayerStanding[];
  totalCompletedGames: number;
  totalGoals: number;
  averageGoalsPerGame: number;
};

type ServiceResult<T> = {
  data: T;
  error: string | null;
};

type RawLineupPlayer = {
  id?: string;
  name?: string;
  slot?: number;
  isGuest?: boolean;
};

export type GameForStandings = {
  id: string;
  team_id?: string;
  teamId?: string;
  status: string;
  shirts_score?: number | null;
  coletes_score?: number | null;
  shirtsScore?: number | null;
  coletesScore?: number | null;
  shirts_lineup?: RawLineupPlayer[];
  coletes_lineup?: RawLineupPlayer[];
  shirtsLineup?: RawLineupPlayer[];
  coletesLineup?: RawLineupPlayer[];
  scheduled_at?: string;
  scheduledAt?: string;
  completed_at?: string | null;
  completedAt?: string | null;
};

export function calculateStandingsFromGames(
  games: GameForStandings[],
): StandingsSummary {
  const playerStatsMap = new Map<string, PlayerStanding>();
  let totalCompletedGames = 0;
  let totalGoals = 0;

  for (const game of games) {
    if (game.status !== "completed") continue;

    const shirtsScore = game.shirtsScore ?? game.shirts_score ?? null;
    const coletesScore = game.coletesScore ?? game.coletes_score ?? null;
    if (shirtsScore === null || coletesScore === null) continue;

    totalCompletedGames += 1;
    totalGoals += shirtsScore + coletesScore;

    const shirtsLineup = game.shirtsLineup ?? game.shirts_lineup ?? [];
    const coletesLineup = game.coletesLineup ?? game.coletes_lineup ?? [];

    const isShirtsWin = shirtsScore > coletesScore;
    const isColetesWin = coletesScore > shirtsScore;
    const isDraw = shirtsScore === coletesScore;

    for (const player of shirtsLineup) {
      const id = player.id || player.name || "desconhecido";
      const name = player.name?.trim() || "Jogador";
      const isGuest = Boolean(player.isGuest);

      let stat = playerStatsMap.get(id);
      if (!stat) {
        stat = {
          playerId: id,
          playerName: name,
          isGuest,
          gamesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          winRate: 0,
        };
        playerStatsMap.set(id, stat);
      }

      stat.gamesPlayed += 1;
      if (isShirtsWin) {
        stat.wins += 1;
        stat.points += 3;
      } else if (isDraw) {
        stat.draws += 1;
        stat.points += 1;
      } else {
        stat.losses += 1;
      }

      stat.goalsFor += shirtsScore;
      stat.goalsAgainst += coletesScore;
      stat.goalDifference = stat.goalsFor - stat.goalsAgainst;
      stat.winRate = Math.round((stat.wins / stat.gamesPlayed) * 100);
    }

    for (const player of coletesLineup) {
      const id = player.id || player.name || "desconhecido";
      const name = player.name?.trim() || "Jogador";
      const isGuest = Boolean(player.isGuest);

      let stat = playerStatsMap.get(id);
      if (!stat) {
        stat = {
          playerId: id,
          playerName: name,
          isGuest,
          gamesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          winRate: 0,
        };
        playerStatsMap.set(id, stat);
      }

      stat.gamesPlayed += 1;
      if (isColetesWin) {
        stat.wins += 1;
        stat.points += 3;
      } else if (isDraw) {
        stat.draws += 1;
        stat.points += 1;
      } else {
        stat.losses += 1;
      }

      stat.goalsFor += coletesScore;
      stat.goalsAgainst += shirtsScore;
      stat.goalDifference = stat.goalsFor - stat.goalsAgainst;
      stat.winRate = Math.round((stat.wins / stat.gamesPlayed) * 100);
    }
  }

  const standings = Array.from(playerStatsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;
    return a.playerName.localeCompare(b.playerName, "pt-PT", { sensitivity: "base" });
  });

  const averageGoalsPerGame =
    totalCompletedGames > 0
      ? Number((totalGoals / totalCompletedGames).toFixed(1))
      : 0;

  return {
    standings,
    totalCompletedGames,
    totalGoals,
    averageGoalsPerGame,
  };
}

export async function fetchTeamStandings(
  teamId: string,
): Promise<ServiceResult<StandingsSummary>> {
  if (!supabase || !teamId) {
    return {
      data: {
        standings: [],
        totalCompletedGames: 0,
        totalGoals: 0,
        averageGoalsPerGame: 0,
      },
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("games")
    .select(
      "id, team_id, status, shirts_score, coletes_score, shirts_lineup, coletes_lineup, scheduled_at, completed_at",
    )
    .eq("team_id", teamId)
    .eq("status", "completed");

  if (error) {
    return {
      data: {
        standings: [],
        totalCompletedGames: 0,
        totalGoals: 0,
        averageGoalsPerGame: 0,
      },
      error: error.message,
    };
  }

  const summary = calculateStandingsFromGames(
    (data ?? []) as unknown as GameForStandings[],
  );

  return {
    data: summary,
    error: null,
  };
}
