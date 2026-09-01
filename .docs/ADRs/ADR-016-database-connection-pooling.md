# ADR-016: Database Connection Lifecycle & Optimization for Supabase Free Tier

## Status

Accepted

## Date

2026-01-27 (Updated 2026-08-31)

## Context

Supabase free tier enforces a **10-connection limit** across the entire project. In serverless environments, database connection management is critical to prevent connection starvation and pool exhaustion.

Initially, a module-level cached singleton connection pool was considered. However, the **Cloudflare Workers runtime enforces strict I/O isolation**:
- Reusing open TCP socket objects across separate request events triggers runtime exceptions (`Cannot perform I/O on behalf of a different request`).
- Serverless worker instances can spin down or handle requests concurrently across isolated contexts.

Therefore, connection management must comply with Cloudflare Workers' execution model while strictly respecting Supabase Free Tier's 10-connection limit.

## Decision

Implement a **lightweight per-request client lifecycle with explicit termination**:

1. **Per-Request Client Creation**: Handlers obtain a database client on demand via `getDb(dbUrl)`.
2. **Minimal Pool Constraints**:
   - `max: 1` — Exactly 1 connection per active request context.
   - `idle_timeout: 10` — Aggressive idle release.
   - `connect_timeout: 5` — 5-second connection acquisition timeout.
   - `prepare: false` — Disable prepared statements to reduce memory and prevent transaction pooler conflicts.
3. **Explicit Handler Cleanup**: Every handler calling `getDb` must execute `closeDb(sql)` inside a `finally` block to immediately release the connection upon request completion.
4. **Centralized Implementation**: Managed in `apps/api/src/shared/db.ts`.
5. **Complementary Frontend Caching & Debouncing**: Frontend features (e.g. `useAuth`) debounce access checks and cache profile existence flags in `localStorage` to drastically reduce unnecessary database queries.

## Rationale

### Cloudflare Workers Runtime Compatibility
- Creating the client within the request context and closing it at handler termination avoids cross-request TCP socket reuse errors.

### Free Tier Connection Conservation
- With `max: 1` and immediate `closeDb(sql)` execution in `finally` blocks, connections are held only for the brief duration of the SQL execution (milliseconds).
- Even under multiple concurrent incoming requests, connections are rapidly released back to PostgreSQL.

### Safety & Resilience
- `prepare: false` ensures compatibility with connection poolers (e.g. Supabase PgBouncer / Supavisor) and direct connections alike.
- Deterministic error handling in `try...catch...finally` guarantees connections are not leaked on query failure.

## Implementation

### Helper Module (`apps/api/src/shared/db.ts`)
```typescript
import postgres from "postgres";

export function getDb(dbUrl: string): ReturnType<typeof postgres> {
  return postgres(dbUrl, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 5,
    prepare: false,
  });
}

export async function closeDb(
  sql: ReturnType<typeof postgres>,
): Promise<void> {
  await sql.end({ timeout: 5 });
}
```

### Handler Pattern (`apps/api/src/features/...`)
```typescript
export async function handleGetConvocationTeams(request: Request, env: Env, convocationId: string) {
  const sql = getDb(env.SUPABASE_DB_URL);
  try {
    const data = await sql`...`;
    return Response.json(data);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  } finally {
    await closeDb(sql);
  }
}
```

## Consequences

### Positive
- **Fully Compatible with Cloudflare Workers**: Zero cross-request I/O errors.
- **Connection Leak Prevention**: Explicit `finally { await closeDb(sql); }` guarantees predictable teardown.
- **Free Tier Compliant**: Transient 1-connection footprint per active query allows handling typical traffic spikes without reaching the 10-connection limit.

### Negative
- **Per-request connection handshake latency**: Opening a connection per request introduces slight connection overhead compared to a warm persistent connection pool.
- **Developer discipline**: Handlers must remember to call `closeDb` in `finally` blocks.

### Mitigations
- Cloudflare Hyperdrive can be introduced in the future to provide pooled, low-latency edge database acceleration without application code changes.
- Automated linting and code review checks ensure proper `try...finally` teardown patterns.

## Related Decisions

- **ADR-003** (Backend API): Cloudflare Workers & Hono architecture
- **ADR-005** (Deployment): Deployment strategy
- **ADR-009** (Migration Management): Free tier database constraints
- **ADR-014** (Hybrid Data Architecture): Direct vs API access boundaries
