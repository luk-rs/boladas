# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Status
Repository now contains a pnpm monorepo:
- `apps/boladas` — React PWA (Vite + TS)
- `apps/api` — Cloudflare Worker (TS)
- `supabase` — schema + seed SQL

## Commands
- Install: `pnpm install`
- Dev app: `pnpm dev:app` (Vite on :5173)
- Dev API: `pnpm dev:api` (Worker on :8787)
- Build all: `pnpm build`

## Pending deployment setup
Cloudflare CI is failing until these are configured:
- GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT`
- Pages project must exist and the project name must match `CLOUDFLARE_PAGES_PROJECT`
- API token needs permissions: Account→Workers:Edit, Account→Pages:Edit, and recommended User→User Details:Read

## Notes
- Suspected Pages project name from screenshot: `boladas` (verify in Cloudflare Pages)
