export type GameStatus = "scheduled" | "completed";

export type LineupPlayer = {
  id?: string;
  name?: string;
  slot?: number;
  isGuest?: boolean;
};

export type GameJson = {
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
  shirtsLineup: LineupPlayer[];
  coletesLineup: LineupPlayer[];
  canRecordResult: boolean;
};

export type GameRow = {
  id: string;
  convocation_id: string | null;
  team_id: string;
  team_name: string | null;
  scheduled_at: string | Date;
  created_at: string | Date;
  status: string;
  shirts_score: number | null;
  coletes_score: number | null;
  completed_at: string | Date | null;
  shirts_lineup: unknown;
  coletes_lineup: unknown;
  can_record_result: boolean;
};

const MAX_SCORE = 2_147_483_647;

export function mapGame(row: GameRow): GameJson {
  return {
    id: row.id,
    convocationId: row.convocation_id,
    teamId: row.team_id,
    teamName: row.team_name ?? "Equipa",
    scheduledAt: toIso(row.scheduled_at),
    createdAt: toIso(row.created_at),
    status: row.status === "completed" ? "completed" : "scheduled",
    shirtsScore: row.shirts_score,
    coletesScore: row.coletes_score,
    completedAt: row.completed_at ? toIso(row.completed_at) : null,
    shirtsLineup: asLineup(row.shirts_lineup),
    coletesLineup: asLineup(row.coletes_lineup),
    canRecordResult: row.can_record_result === true,
  };
}

export function parseResultBody(
  body: unknown,
):
  | { ok: true; shirtsScore: number; coletesScore: number }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const record = body as Record<string, unknown>;
  const shirtsScore = parseScore(record.shirtsScore, "shirtsScore");
  if (typeof shirtsScore === "string") {
    return { ok: false, error: shirtsScore };
  }
  const coletesScore = parseScore(record.coletesScore, "coletesScore");
  if (typeof coletesScore === "string") {
    return { ok: false, error: coletesScore };
  }

  return { ok: true, shirtsScore, coletesScore };
}

export function parseGameId(value: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}

function parseScore(value: unknown, field: string): number | string {
  if (value === undefined || value === null) {
    return `${field} is required`;
  }
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_SCORE
  ) {
    return `${field} must be a non-negative integer`;
  }
  return value;
}

function asLineup(value: unknown): LineupPlayer[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is LineupPlayer =>
      Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
  );
}

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}
