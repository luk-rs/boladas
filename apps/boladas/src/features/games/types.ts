export type GameStatus = "scheduled" | "completed";

/** Player JSON stored on a game. Same keys as GET /games and PUT /games/:id/result. */
export type GameLineupPlayer = {
  id?: string;
  name?: string;
  slot?: number;
  isGuest?: boolean;
};

export type Game = {
  id: string;
  convocationId: string | null;
  teamId: string;
  teamName: string;
  scheduledAt: string;
  createdAt: string;
  status: GameStatus;
  shirtsScore: number | null;
  coletesScore: number | null;
  completedAt: string | null;
  shirtsLineup: GameLineupPlayer[];
  coletesLineup: GameLineupPlayer[];
  canRecordResult: boolean;
};

export type GameResultScores = {
  shirtsScore: number;
  coletesScore: number;
};
