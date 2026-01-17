# boladas monorepo

## Requirements
- Node.js 20+ (LTS)
- pnpm (global): `npm i -g pnpm`

## Structure
- `apps/boladas` — React PWA (Vite + TS)
- `apps/api` — Cloudflare Workers API (TS)
- `supabase` — schema + seed SQL

## Setup
1. Install deps:
   - `pnpm install`
2. Copy env:
   - `cp .env.example apps/boladas/.env`
   - Update `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Dev
- API: `pnpm dev:api` (http://localhost:8787)
- App: `pnpm dev:app` (http://localhost:5173)

## Supabase
Create a Supabase project and configure providers:
Google, Facebook (Meta), Microsoft (Outlook), Apple, Magic Link.

Run schema:
- Apply `supabase/schema.sql` in Supabase SQL editor

Optional seed:
- Run `supabase/seed.sql`

## Deploy (Cloudflare)
You’ll need:
- Cloudflare account
- Pages project for `apps/boladas`
- Workers API name (default `boladas-api`)

Set GitHub secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PAGES_PROJECT` (Pages project name)

Optional worker name override:
- Set `WORKER_NAME` secret (if different from `wrangler.toml`)

Set Cloudflare Pages environment variables (in Pages settings):
- `VITE_API_URL` (your deployed worker URL)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Set Cloudflare Workers variable (in Workers settings or wrangler env):
- `ALLOWED_ORIGIN` (your Pages URL)

## Notes
- Free tiers apply; avoid heavy compute in Workers.
