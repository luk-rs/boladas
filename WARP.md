# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

⚠️ **Note**: For comprehensive agent instructions, see `.docs/AGENTS.md` (canonical source)

## Status
Fresh start with new Supabase organization and rotated credentials:
- **Organization**: `futeboladas`
- **Project**: `boladas`
- **Project ID**: `jqvynvxpnotjnfdxmdwj`
- **Production URL**: https://jqvynvxpnotjnfdxmdwj.supabase.co

## Repository Structure
pnpm monorepo:
- `apps/boladas` — React PWA (Vite + TS)
- `apps/api` — Cloudflare Worker (TS)
- `supabase` — schema + migrations SQL

## Commands
- Install: `pnpm install`
- Dev app: `pnpm dev:app` (Vite on :5173)
- Dev API: `pnpm dev:api` (Worker on :8787)
- Build all: `pnpm build`
- Supabase: `supabase start` / `supabase stop` / `supabase status`

## Local Development
- Use **Supabase CLI** (not docker-compose) for local database
- Containers grouped under `futeboladas-boladas` project ID
- Local Supabase runs on http://localhost:54321
- Studio UI available at http://localhost:54323

## Deployment
✅ **GitHub Secrets Configured**:
- Cloudflare: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT`
- Supabase: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`
- App vars: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

✅ **CI/CD**: Migrations run automatically on deploy via GitHub Actions
