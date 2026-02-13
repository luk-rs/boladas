import { closeDb, getDb } from "../../shared/db";
import { corsHeaders } from "../../shared/cors";
import type { Env } from "../../index";

type PlayerRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
};

type Player = {
  id: string;
  name: string;
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const mulberry32 = (seed: number) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T>(items: T[], seed: number) => {
  const random = mulberry32(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export async function handleGetConvocationTeams(
  request: Request,
  env: Env,
  convocationId: string,
  origin?: string,
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders(origin),
    });
  }

  if (!env.SUPABASE_DB_URL) {
    return new Response("Missing DB Configuration", { status: 500 });
  }

  if (!convocationId) {
    return new Response("Missing convocationId", {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  const sql = getDb(env.SUPABASE_DB_URL);

  try {
    const convocationRows = await sql<{
      id: string;
      scheduled_at: string;
      team_name: string;
    }[]>`
      select c.id, c.scheduled_at, t.name as team_name
      from convocations c
      join teams t on t.id = c.team_id
      where c.id = ${convocationId}
      limit 1
    `;

    if (convocationRows.length === 0) {
      return new Response("Convocation not found", {
        status: 404,
        headers: corsHeaders(origin),
      });
    }

    const players = await sql<PlayerRow[]>`
      select cv.user_id, p.display_name, p.email
      from convocation_votes cv
      left join profiles p on p.id = cv.user_id
      where cv.convocation_id = ${convocationId}
        and cv.state = 'ball'
      order by cv.updated_at asc
    `;

    const roster: Player[] = players.map((player) => ({
      id: player.user_id,
      name: player.display_name ?? player.email ?? "Jogador",
    }));

    const shuffled = shuffle(roster, hashString(convocationId));
    const midpoint = Math.ceil(shuffled.length / 2);
    const shirts = shuffled.slice(0, midpoint);
    const coletes = shuffled.slice(midpoint);

    return Response.json(
      {
        convocationId,
        teamName: convocationRows[0].team_name,
        scheduledAt: convocationRows[0].scheduled_at,
        teams: { shirts, coletes },
      },
      {
        headers: corsHeaders(origin),
      },
    );
  } catch (error: any) {
    console.error("Database Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders(origin),
    });
  } finally {
    await closeDb(sql);
  }
}
