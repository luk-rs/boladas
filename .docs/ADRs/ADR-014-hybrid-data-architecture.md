# ADR-014: Hybrid Data Architecture & Frontend Service Mediation

## Status

Accepted

## Date

2026-02-16 (updated)

## Context

The hybrid architecture decision (API for read-heavy/public, direct Supabase for authenticated writes/realtime) remains valid. However, direct Supabase usage from page/component code created coupling and inconsistent data-flow boundaries.

To keep the hybrid model maintainable at scale, frontend data access needs a strict mediation layer.

## Decision

We keep the hybrid data strategy and add a mandatory frontend layering rule:

### 1. Data access path selection remains hybrid

- **API Path**: high-frequency/public reads with caching.
- **Direct Path**: authenticated writes, RPC business logic, and realtime.

### 2. Frontend service-layer mediation is mandatory

- Supabase client usage (`from`, `rpc`, `channel`, auth data calls) must live in `services` files.
- Pages and presentational components must not import Supabase directly.
- Contexts orchestrate service calls and expose domain behavior.

### 3. Context contracts are standardized

Domain contexts expose:

- `{ state, actions }`

This enforces a consistent UI integration surface and isolates orchestration from rendering.

### 4. Transitional compatibility

When migrating legacy modules, compatibility wrappers/adapters may be used temporarily as long as they preserve the service/context boundary.

## Consequences

### Positive

- Stronger separation of concerns and easier testing of data operations.
- Safer refactors with explicit service contracts.
- Reduced risk of duplicated query/RPC logic across UI code.

### Negative

- More files per feature (services + contexts + UI).
- Slightly higher upfront setup for small changes.

## Implementation Guide

- New direct data calls go into `features/*/services/*.service.ts`.
- Pages/components call context actions or read context state.
- Contexts compose services and domain rules.
- Keep route URLs stable unless explicitly changed by product requirements.
