import type { EmojiStackItem } from "../team-scope/components/EmojiStack";

export type UpcomingGame = {
  id: string;
  convocationId: string | null;
  teamId: string;
  teamName: string;
  scheduledAt: string;
  createdAt: string;
  shirtsLineup: EmojiStackItem[];
  coletesLineup: EmojiStackItem[];
};
