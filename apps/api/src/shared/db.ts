import postgres from "postgres";

/**
 * Create a per-request database client.
 *
 * Cloudflare Workers disallow reusing I/O objects across requests, so we avoid
 * a global singleton and close the client after each handler finishes.
 */
export function getDb(dbUrl: string): ReturnType<typeof postgres> {
  return postgres(dbUrl, {
    // Keep the pool tiny; we close per request.
    max: 1,
    idle_timeout: 10,
    connection_timeout: 5,
    prepare: false,
  });
}

export async function closeDb(
  sql: ReturnType<typeof postgres>,
): Promise<void> {
  await sql.end({ timeout: 5 });
}
