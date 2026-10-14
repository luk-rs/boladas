import { closeDb, getDb } from "../../shared/db";
import { corsHeaders } from "../../shared/cors";
import type { Env } from "../../index";

type TeamRow = {
  id: string;
  name: string;
  created_by: string;
  min_players: number | null;
  season_start: string | null;
  holiday_start: string | null;
  game_definitions: unknown;
  member_count: string | number;
};

type GameDefinition = {
  dayOfWeek: number;
  startTime: string;
};

export async function handleGenerateUpcomingConvocations(
  request: Request,
  env: Env,
  origin?: string,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders(origin),
    });
  }

  if (!env.SUPABASE_DB_URL) {
    return new Response("Missing DB Configuration", {
      status: 500,
      headers: corsHeaders(origin),
    });
  }

  const sql = getDb(env.SUPABASE_DB_URL);

  try {
    const teams = await sql<TeamRow[]>`
      select t.id, t.name, t.created_by, t.min_players, t.season_start, t.holiday_start, t.game_definitions,
             count(tm.id) as member_count
      from teams t
      join team_members tm on tm.team_id = t.id
      where t.game_definitions is not null
      group by t.id, t.name, t.created_by, t.min_players, t.season_start, t.holiday_start, t.game_definitions
      having count(tm.id) >= coalesce(t.min_players, 10)
    `;

    const created: Array<{
      convocationId: string;
      teamId: string;
      title: string;
      scheduledAt: string;
    }> = [];

    const now = new Date();

    for (const team of teams) {
      const rawDefs = team.game_definitions;
      if (!Array.isArray(rawDefs)) continue;

      for (const item of rawDefs) {
        if (!item || typeof item !== "object") continue;
        const def = item as GameDefinition;
        if (typeof def.dayOfWeek !== "number" || typeof def.startTime !== "string") {
          continue;
        }

        const [hours, minutes] = def.startTime.split(":").map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) continue;

        // Calculate next occurrence
        const currentDay = now.getUTCDay();
        let daysAhead = (def.dayOfWeek - currentDay + 7) % 7;
        if (daysAhead === 0) daysAhead = 7;

        const nextDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
        nextDate.setUTCHours(hours, minutes, 0, 0);

        const definitionKey = `day:${def.dayOfWeek}-${def.startTime}`;

        // Check if an open convocation already exists for this definition
        const existing = await sql<{ id: string }[]>`
          select id from convocations
          where team_id = ${team.id}
            and game_definition_key = ${definitionKey}
            and status = 'open'
          limit 1
        `;

        if (existing.length > 0) {
          continue;
        }

        // Create the convocation
        const inserted = await sql<{ id: string }[]>`
          insert into convocations (
            team_id,
            title,
            scheduled_at,
            status,
            created_by,
            game_definition_key
          ) values (
            ${team.id},
            ${team.name},
            ${nextDate.toISOString()},
            'open',
            ${team.created_by},
            ${definitionKey}
          )
          returning id
        `;

        if (inserted.length > 0) {
          const convocationId = inserted[0].id;

          // Seed default votes for all members in team
          await sql`
            insert into convocation_votes (convocation_id, user_id, state)
            select ${convocationId}, tm.user_id, 'couch'
            from team_members tm
            where tm.team_id = ${team.id}
            on conflict (convocation_id, user_id) do nothing
          `;

          created.push({
            convocationId,
            teamId: team.id,
            title: team.name,
            scheduledAt: nextDate.toISOString(),
          });
        }
      }
    }

    return Response.json(
      {
        success: true,
        createdCount: created.length,
        created,
      },
      {
        headers: corsHeaders(origin),
      },
    );
  } catch (error: any) {
    console.error("Error generating upcoming convocations:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders(origin),
    });
  } finally {
    await closeDb(sql);
  }
}
