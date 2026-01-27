# ADR-016: Database Connection Pooling for Supabase Free Tier

## Status

Accepted

## Date

2026-01-27

## Context

Supabase free tier enforces a **10-connection limit** across the entire project. Initial API implementation created a new database connection for every request and closed it immediately:

```typescript
const sql = postgres(env.SUPABASE_DB_URL);
// ... query ...
await sql.end();
```

This pattern would exhaust the 10-connection limit at ~10 concurrent requests, making the free tier tier unsuitable for even small production apps.

Additionally:
- Cloudflare Workers run on serverless infrastructure where connection caching is beneficial
- Connection churn (create/close per request) increases latency
- `postgres.js` library supports built-in connection pooling

## Decision

Implement a **singleton connection pool pattern** for database access:

1. **Singleton Client**: Create one `postgres` client instance per Worker environment and cache it in module-level state
2. **Pool Configuration**:
   - `max: 3` — Conservative pool size (3 out of 10 connections max)
   - `idle_timeout: 30` — Close idle connections after 30 seconds
   - `connection_timeout: 5` — 5-second timeout for acquiring connections
   - `prepare: false` — Disable prepared statements to reduce memory overhead
3. **Shared Access**: All request handlers access the pool via `getDb(dbUrl)` function
4. **No Per-Request Cleanup**: Don't call `.end()` on the pool; let it persist across requests
5. **Location**: Centralized in `apps/api/src/shared/db.ts` for reuse across all Worker handlers

## Rationale

### Efficiency
- **Reuses connections** across multiple requests instead of creating/destroying per request
- **Reduces latency** by keeping connections warm and ready
- **Conserves free tier resources** by limiting total connections to 3 instead of unlimited

### Serverless Compatibility
- **Cloudflare Workers** automatically preserve module-level state across requests within the same execution context
- **Connection pooling** becomes effectively free with this architecture
- **No external cache** needed (unlike traditional servers where pooling requires Redis)

### Safety
- **Pool size limits** prevent exhaustion even with high concurrency
- **Idle timeout** prevents stale connections from consuming limits
- **Disabled prepared statements** reduce memory overhead per connection

### Scaling
With 3 connections, the API can handle:
- Dozens of concurrent users (typical usage pattern)
- Brief traffic spikes (pooling absorbs connection churn)
- Multiple simultaneous request handlers

## Implementation

### Before (Per-Request Connection)
```typescript
export async function handleGetGames(request: Request, env: any) {
  const sql = postgres(env.SUPABASE_DB_URL); // New connection
  try {
    // ... query ...
  } finally {
    await sql.end(); // Close immediately
  }
}
```

**Problem**: 10 concurrent requests = exhausted free tier

### After (Singleton Pool)
```typescript
// shared/db.ts
let cachedSql: ReturnType<typeof postgres> | null = null;
export function getDb(dbUrl: string) {
  if (!cachedSql) {
    cachedSql = postgres(dbUrl, {
      max: 3,
      idle_timeout: 30,
      prepare: false,
    });
  }
  return cachedSql;
}

// features/games/get-games.ts
export async function handleGetGames(request: Request, env: any) {
  const sql = getDb(env.SUPABASE_DB_URL); // Reuses cached pool
  try {
    // ... query ...
  }
  // No cleanup; pool persists
}
```

**Benefit**: 100+ concurrent requests possible with 3 connections

## Consequences

### Positive
- **Free Tier Sustainable**: Scales to production-grade usage on free tier
- **Lower Latency**: Eliminates connection setup overhead per request
- **Reduced Database Load**: Fewer connect/disconnect cycles
- **Simpler Code**: Single `getDb()` function replaces per-handler setup
- **Future Ready**: Easy to migrate to higher-tier databases later

### Negative
- **Module State Dependency**: Relies on Cloudflare Worker's execution model (not portable to other runtimes without changes)
- **Connection Reuse Risk**: If a connection becomes corrupted, it affects all requests (rare but possible)
- **Memory Persistence**: Pool state persists in Worker memory; may accumulate over time in long-running processes

### Mitigations
- Pool `idle_timeout` cleans up stale connections automatically
- Monitor pool health via error logging (implement in future)
- Design for connection pool migration path if upgrading to higher tier
- Document the singleton pattern for future maintainers

## Related Decisions

- **ADR-003** (Backend API): Workers architecture
- **ADR-005** (Deployment): Cloudflare Workers deployment
- **ADR-009** (Migration Management): Free tier database constraints
- **ADR-014** (Hybrid Data Architecture): Client vs. server data access patterns

## Future Enhancements

- Add connection pool health metrics and monitoring
- Implement graceful shutdown for Worker process termination
- Consider upgrade path for Supabase Pro tier (higher connection limits)
