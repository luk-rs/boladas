import type { EmojiStackItem } from "../team-scope/components/EmojiStack";

export type GameStatus = "scheduled" | "completed";

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
  shirtsLineup: EmojiStackItem[];
  coletesLineup: EmojiStackItem[];
  canRecordResult: boolean;
};

export type GameResultScores = {
  shirtsScore: number;
  coletesScore: number;
};
