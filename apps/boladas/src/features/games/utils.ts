import type { Game, GameStatus } from "./types";

const MAX_SCORE = 2_147_483_647;

export const formatSchedule = (scheduledAt: string) => {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: "--", timeLabel: "--" };
  }

  const dateLabel = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return { dateLabel, timeLabel };
};

export function hasRecordedScore(game: {
  status: GameStatus;
  shirtsScore: number | null;
  coletesScore: number | null;
}): boolean {
  return (
    game.status === "completed" &&
    typeof game.shirtsScore === "number" &&
    typeof game.coletesScore === "number"
  );
}

type ParsedScore =
  | { ok: true; value: number }
  | { ok: false; reason: "empty" | "invalid" };

export function parseScoreField(raw: string): ParsedScore {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, reason: "empty" };
  if (!/^\d+$/.test(trimmed)) return { ok: false, reason: "invalid" };

  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value > MAX_SCORE) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, value };
}

export function scoreFormError(shirtsRaw: string, coletesRaw: string): string | null {
  const shirts = parseScoreField(shirtsRaw);
  const coletes = parseScoreField(coletesRaw);
  if (shirts.ok && coletes.ok) return null;

  const shirtsEmpty = !shirts.ok && shirts.reason === "empty";
  const coletesEmpty = !coletes.ok && coletes.reason === "empty";
  if (shirtsEmpty && coletesEmpty) {
    return "Indica o resultado das camisolas e dos coletes.";
  }
  if (shirtsEmpty) return "Indica o resultado das camisolas.";
  if (coletesEmpty) return "Indica o resultado dos coletes.";
  return "O resultado tem de ser um número inteiro igual ou superior a zero.";
}

/** Matches `list_visible_games`: scheduled soonest first, then completed by kickoff, newest first. */
export function sortGames(games: Game[]): Game[] {
  return [...games].sort((left, right) => {
    const leftCompleted = left.status === "completed" ? 1 : 0;
    const rightCompleted = right.status === "completed" ? 1 : 0;
    if (leftCompleted !== rightCompleted) return leftCompleted - rightCompleted;

    const leftTime = Date.parse(left.scheduledAt);
    const rightTime = Date.parse(right.scheduledAt);
    const leftValue = Number.isNaN(leftTime) ? 0 : leftTime;
    const rightValue = Number.isNaN(rightTime) ? 0 : rightTime;
    return leftCompleted ? rightValue - leftValue : leftValue - rightValue;
  });
}
