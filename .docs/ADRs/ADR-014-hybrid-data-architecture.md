# ADR-014: Hybrid Data Architecture Strategy

## Status

Accepted

## Context

As the application scales, we face the risk of **Supabase Resource Exhaustion** (specifically Connection Limits and CPU usage) and **522 Timeouts** when relying solely on direct client-side database connections.

We originally built the application using a "Backend-as-a-Service" (BaaS) pattern, where the frontend connects directly to Supabase. This provides speed and simplicity but exposes the database to unfiltered traffic surges.

## Decision

We will adopt a **Hybrid Data Architecture** that splits data access logic into two distinct paths:

### 1. API Path (Read-Heavy / Public)

**Use Cloudflare Workers API for high-frequency public reads.**

- **Target Criteria**: high-volume public reads, data that tolerates eventual consistency (caching), and aggregations or lists accessed by unauthenticated or loosely authenticated users.
- **Technology**: Cloudflare Workers + Caching API + Supavisor Connection Pooling (Port 6543).
- **Rationale**:
  - **Caching**: A single worker can serve 10,000 requests/sec with a 60s cache policy, hitting the DB only once.
  - **Protection**: Workers act as a shield against DDoS or "Refresh Spam".

### 2. Direct Path (Write-Heavy / Authenticated / Realtime)

**Keep using Supabase Direct Client for Writes, Auth, and Subscriptions.**

- **Target Criteria**: Authenticated transactional writes, complex business logic (RPCs), real-time subscriptions, or data requiring strict consistency (no staleness).
- **Technology**: `@supabase/supabase-js`.
- **Rationale**:
  - **Atomicity**: RPCs guarantee transactional integrity better than distributed API calls.
  - **Simplicity**: Supabase Auth (HttpOnly cookies) is complex to proxy. Direct usage is standard and secure.
  - **Latency**: Removes the extra "Worker" hop for actions that cannot be cached anyway.

## Consequences

### Positive

- **Resilience**: The application will not go down (522) during traffic spikes on public pages.
- **Cost**: Drastically reduces Database Compute usage by offloading reads to the CDN edge.

### Negative

- **Complexity**: Developers must decide "API vs Direct" for every new feature.
- **Consistency**: API data may be up to 60s stale (acceptable for Standings, not for Chat).

## Implementation Guide

- **New Reads**: Default to API (`fetch('/api/...')`).
- **New Writes**: Default to RPC (`supabase.rpc(...)`).
- **New Realtime**: Default to Direct (`supabase.channel(...)`).
