import { getDb } from "../../shared/db";

export async function handleGetGames(request: Request, env: any) {
  if (!env.SUPABASE_DB_URL) {
    return new Response("Missing DB Configuration", { status: 500 });
  }

  // Use singleton connection pool instead of creating a new connection per request
  // This prevents connection exhaustion on Supabase free tier (10-connection limit)
  const sql = getDb(env.SUPABASE_DB_URL);

  try {
    // Basic query to verify connection
    // In the future this should fetch from a real 'games' table
    // For now we return the same mock structure as the frontend to verify the pipeline
    const games = [
      {
        id: "game-1",
        date: "18 Dez 2022",
        time: "13:00",
        opponent: "Team B",
        isNext: true,
      },
      {
        id: "game-2",
        date: "14 Dez 2022",
        result: "2-1",
        isPrevious: true,
      },
    ];

    // NOTE: In a real implementation we would do:
    // const games = await sql`SELECT * FROM games ORDER BY date DESC`;

    // Cache for 60 seconds at the edge
    return new Response(JSON.stringify(games), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=60",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("Database Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  // No cleanup needed - singleton client persists across requests
}
