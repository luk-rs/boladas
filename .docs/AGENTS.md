# AGENTS.md

This file provides instructions to AI agents (WARP, Claude, etc.) when working with this repository.

## Critical Instructions

### ADR Management

**ALWAYS automatically update or create ADRs whenever architectural or technical decisions are made, changed, or discussed.**

- **Roll forward, never back**: When decisions change, UPDATE the existing ADR rather than superseding it with a new one
- **Create new ADRs only when**: A completely new decision area is being documented
- **Update existing ADRs when**: A previous decision is being modified, extended, or refined
- Location: All ADRs must be placed in `.docs/ADRs/`
- Naming: Use format `ADR-NNN-short-title.md` (e.g., `ADR-001-monorepo-structure.md`)

### When to Update ADRs

Automatically update/create ADRs when:

- Choosing or changing build tools, frameworks, or libraries
- Making architectural decisions (monorepo, deployment strategy, etc.)
- Establishing patterns or conventions (API design, state management, etc.)
- Configuring infrastructure or deployment pipelines
- Making security or authentication decisions
- Choosing data storage or API approaches
- **Team Prerequisite**: A user MUST be part of at least one team to be logged in. (Exception: pending registration or system_admin).

## Project Overview

### Repository Structure

```
boladas/
├── apps/
│   ├── boladas/        # React PWA (Vite + TypeScript)
│   └── api/            # Cloudflare Worker API (TypeScript)
├── supabase/           # Database schema + seed SQL
└── .docs/              # Documentation (this directory)
    └── ADRs/           # Architecture Decision Records
```

### Tech Stack

- **Frontend**: React 18, Vite, TypeScript, PWA (vite-plugin-pwa)
- **Backend**: Cloudflare Workers, Wrangler
- **Database**: Supabase (PostgreSQL)
- **Package Manager**: pnpm with workspace (monorepo)
- **Node**: >= 20.0.0

### Commands

- Install: `pnpm install`
- Dev (app): `pnpm dev:app` → http://localhost:5173
- Dev (API): `pnpm dev:api` → http://localhost:8787
- Build all: `pnpm build`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`

## Development Guidelines

### Before Making Changes

1. Check existing ADRs in `.docs/ADRs/` to understand current decisions
2. If changing an existing pattern, update the relevant ADR
3. If introducing a new pattern, create a new ADR

### Code Quality

- Always run `pnpm lint` and `pnpm typecheck` before completing work
- Ensure all TypeScript code is properly typed (no `any` without justification)
- Follow existing patterns and conventions in the codebase

### Git Commits

When committing changes (only when explicitly requested by user):

- Include co-author line: `Co-Authored-By: Warp <agent@warp.dev>` at the end of commit messages

## Deployment Status

⚠️ Cloudflare CI pending configuration:

- GitHub Secrets needed: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT`
- Pages project must exist in Cloudflare dashboard
- Suspected project name: `boladas`
