import postgres from "postgres";

/**
 * Shared database client for Cloudflare Workers
 * 
 * This uses a singleton pattern to reuse a single connection pool across requests.
 * Cloudflare Workers can cache connections in memory, reducing latency and 
 * preventing connection pool exhaustion on Supabase free tier (10-connection limit).
 * 
 * The `postgres.js` library handles connection pooling automatically.
 * We create one client per environment and reuse it.
 */

let cachedSql: ReturnType<typeof postgres> | null = null;

export function getDb(dbUrl: string): ReturnType<typeof postgres> {
  if (!cachedSql) {
    cachedSql = postgres(dbUrl, {
      // Connection pooling configuration
      // These limits help prevent exhausting Supabase free tier (10 connections max)
      max: 3, // Max connections in pool (conservative for free tier)
      idle_timeout: 30, // Close idle connections after 30s
      connection_timeout: 5, // 5s timeout for new connections
      prepare: false, // Disable prepared statements to reduce memory usage
    });
  }
  return cachedSql;
}

/**
 * Closes the cached connection pool.
 * Used for cleanup in tests or graceful shutdown.
 */
export async function closeDb(): Promise<void> {
  if (cachedSql) {
    await cachedSql.end();
    cachedSql = null;
  }
}
