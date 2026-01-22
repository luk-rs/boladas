# ADR-003: Backend API Architecture

**Status**: Active  
**Date**: 2026-01-22  
**Decision Makers**: Project team

## Context
Need a serverless API solution that:
- Scales automatically without infrastructure management
- Has low cold-start times
- Integrates well with frontend deployment
- Provides edge computing capabilities
- Keeps costs low at small scale

## Decision
Use **Cloudflare Workers** as the backend API runtime.

### Technology Stack
- **Cloudflare Workers**: Serverless edge compute platform
- **Wrangler 4.60.0**: Official CLI for development and deployment
- **TypeScript 5.7.3**: Type-safe API development
- **@cloudflare/workers-types**: TypeScript definitions for Workers API

### Development Setup
- Port: 8787 (Wrangler default)
- Local development: `pnpm dev:api` (wrangler dev)
- Build validation: `pnpm build` (dry-run deployment)

## Rationale

### Cloudflare Workers over AWS Lambda / Vercel Functions
- **Global edge network**: Sub-50ms latency worldwide
- **No cold starts**: V8 isolates vs. containers = instant execution
- **Cost effective**: 100k requests/day on free tier
- **Native Wrangler tooling**: Excellent DX for local dev

### Serverless over Traditional Server
- Zero infrastructure management
- Automatic scaling (0 to millions)
- Pay-per-use pricing model
- No server maintenance or patching

### TypeScript
- Shared language with frontend reduces context switching
- Workers runtime has excellent TS support
- Type safety for request/response handling

## Consequences

### Positive
- Extremely low latency from edge deployment
- No cold start delays for users
- Scales automatically without configuration
- Simple deployment via Wrangler CLI
- Free tier sufficient for early development

### Negative
- Cloudflare-specific platform lock-in
- Workers have execution time limits (CPU time)
- Limited to JavaScript/WASM runtimes (no native libraries)
- Different mental model than traditional Node.js server

## Implementation
- API code located in `apps/api/`
- Wrangler configuration at `apps/api/wrangler.toml`
- TypeScript with Workers types
- Deployment via `wrangler deploy` (manual or CI/CD)

## Deployment Status
⚠️ **Pending**: GitHub Actions CI requires secrets configuration:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PAGES_PROJECT`
