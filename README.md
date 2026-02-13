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
   - Update `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AUTH_ENABLED_PROVIDERS`

## Dev
- API: `pnpm dev:api` (http://localhost:8787)
- App: `pnpm dev:app` (http://localhost:5173)

## OAuth providers (Google + Microsoft + Meta)
The app supports the providers below in all entry points: login, create team, and invite join.
- Google (`google`)
- Microsoft/Outlook (`azure` in Supabase SDK/config)
- Meta/Facebook (`facebook`)

Provider availability is environment-driven with:
- `VITE_AUTH_ENABLED_PROVIDERS=google,azure,facebook`

### Local (Supabase CLI)
1. Copy provider secret template:
   - `cp supabase/.env.example supabase/.env`
2. Fill OAuth credentials in `supabase/.env`:
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`
   - `SUPABASE_AUTH_EXTERNAL_AZURE_CLIENT_ID`
   - `SUPABASE_AUTH_EXTERNAL_AZURE_SECRET`
   - `SUPABASE_AUTH_EXTERNAL_AZURE_URL`
   - `SUPABASE_AUTH_EXTERNAL_FACEBOOK_CLIENT_ID`
   - `SUPABASE_AUTH_EXTERNAL_FACEBOOK_SECRET`
3. Ensure app env has enabled providers:
   - `VITE_AUTH_ENABLED_PROVIDERS=google,azure,facebook`
4. Restart services:
   - `supabase stop && supabase start`
   - `pnpm dev:app`

### Production (Supabase dashboard + Cloudflare Pages)
1. In Supabase dashboard: Auth > Providers, enable and configure Google, Azure, Facebook.
2. In each OAuth app console, configure callback URL:
   - `https://<project-ref>.supabase.co/auth/v1/callback`
3. In Cloudflare Pages env vars, set:
   - `VITE_AUTH_ENABLED_PROVIDERS=google,azure,facebook`
   - `VITE_API_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In Supabase Auth URL settings, allow your deployed frontend URL as a redirect origin.

## Supabase

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
