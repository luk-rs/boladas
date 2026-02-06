export type PlayerState = "ball" | "couch" | "hospital";
export type ConvocationStatus = "open" | "accepted" | "dismissed";

export type EmojiStackItem = {
  id: string;
  label?: string;
  isSelf?: boolean;
};

export type VoteEntry = {
  userId: string;
  label: string;
  updatedAt: string;
};

export type TeamRosterStatus = {
  id: string;
  name: string;
  memberCount: number;
  members: EmojiStackItem[];
};

export type Convocation = {
  id: string;
  teamId: string;
  teamName: string;
  title?: string | null;
  scheduledAt: string;
  status: ConvocationStatus;
  roster: {
    ball: number;
    couch: number;
    hospital: number;
  };
  myState: PlayerState;
  ballVotes: VoteEntry[];
  couchVotes: VoteEntry[];
  hospitalVotes: VoteEntry[];
};

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

export type HoldIntent = "accepted";

export type HoldProgress = {
  intent: HoldIntent;
  progress: number;
};
