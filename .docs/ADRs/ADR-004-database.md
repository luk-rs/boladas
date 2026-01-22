# ADR-004: Database and Backend Services

**Status**: Active  
**Date**: 2026-01-22  
**Decision Makers**: Project team

## Context
Need a database solution that:
- Works well with serverless architecture
- Provides real-time capabilities
- Offers authentication and storage out-of-the-box
- Has a generous free tier
- Supports modern SQL with good TypeScript integration

## Decision
Use **Supabase** as the backend-as-a-service platform.

### Services Used
- **PostgreSQL Database**: SQL database with full ACID compliance
- **Supabase Client SDK**: `@supabase/supabase-js` v2.49.0 in frontend

### Schema Management
- SQL migrations stored in `supabase/` directory
- Seed data for development/testing
- Version controlled schema as code

## Rationale

### Supabase over Firebase
- **SQL vs NoSQL**: Relational data model with foreign keys, joins, transactions
- **Open source**: Self-hostable, no vendor lock-in risk
- **PostgreSQL**: Battle-tested, feature-rich, excellent tooling
- **Standards-based**: Uses PostgREST API (RESTful), standard auth patterns

### Supabase over Direct PostgreSQL
- **Built-in authentication**: Row-level security, JWT tokens, social auth
- **Real-time subscriptions**: WebSocket-based change notifications
- **Storage**: File upload/download with access policies
- **Auto-generated APIs**: PostgREST provides instant REST API from schema
- **Free tier**: 500MB database, generous API limits

### Integration with Cloudflare Workers
- Supabase API accessible via HTTPS from Workers
- Connection pooling handled by Supabase (no direct DB connections needed)
- Edge-compatible authentication with JWT verification

## Consequences

### Positive
- Rapid development with auth/storage built-in
- Real-time features without custom WebSocket server
- SQL provides data integrity and complex queries
- Excellent TypeScript support with generated types
- Free tier sufficient for development and early users

### Negative
- Adds external service dependency
- Data residency controlled by Supabase hosting region
- API calls from Workers may have latency (not edge-local)
- Learning curve for PostgreSQL and row-level security

## Implementation
- Schema SQL files in `supabase/` directory
- Frontend connects via `@supabase/supabase-js`
- API (Cloudflare Workers) connects via Supabase REST API
- Environment variables for `SUPABASE_URL` and `SUPABASE_ANON_KEY`

## Future Considerations
- Consider Supabase edge functions if Workers become insufficient
- Monitor database size and query performance as data grows
- Evaluate self-hosted Supabase if vendor costs become significant
