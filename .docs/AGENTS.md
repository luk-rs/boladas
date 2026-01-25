# AGENTS.md

This file provides instructions to AI agents (WARP, Claude, etc.) when working with this repository.

⚠️ **IMPORTANT**: This is the canonical file for agent-specific instructions. Always update `.docs/AGENTS.md`, NOT `.agent/Agents.md`.

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

### Local Development Environment

**Supabase CLI** (Recommended and Standard):
- Start: `supabase start`
- Stop: `supabase stop`
- Status: `supabase status`
- Link to remote: `supabase link --project-ref <project-id>`
- Push migrations: `supabase db push`
- Container naming: All containers are grouped under `futeboladas-boladas` project ID

**Docker Compose** (Not Used for Development):
- The `docker-compose.yml` file exists for reference/self-hosting scenarios only
- DO NOT use `docker compose up/down` for local development
- Use Supabase CLI instead (industry standard and better integration)

**Database Migrations**:
- Migrations are handled by CI/CD pipeline (GitHub Actions)
- Migrations run automatically on deploy to production via `supabase db push`
- DO NOT manually run migrations against production unless explicitly requested

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

## Styling & UI Guidelines

### Styling Engine
- **Tailwind CSS (v3.4+)**: Use Tailwind utility classes for all styling
- **Material UI Aspect**: Aim for refined, modern look inspired by Material Design 3
  - Rounded corners: `rounded-xl` (12px) or `rounded-2xl` (16px)
  - Elevation: Use `shadow-mui` or `shadow-lg`
  - Typography: Clear hierarchy using Tailwind font sizes

### Layout: Mobile-Only
- **Mobile Centering**: App is strictly middle-aligned, max width `450px` on desktop
- **Shell**: Use `.mobile-shell` utility class in `AppShell.tsx`
- **Responsive**: Design for touch interaction and narrow viewports first

### Theming: Dark & Light Modes
- **Strategy**: Class-based dark mode (`.dark` on `html`)
- **Surface Colors**:
  - Light: Background `#f5f5f5`, Surface `#ffffff`, Text `#111827`
  - Dark: Background `#0f172a`, Surface `#1e293b`, Text `#f9fafb`
- **Primary Color**: Use `primary` color scale (Sky/Blue) from `tailwind.config.js`

### Navigation
- **Radial Menu**: Use `RadialMenu` component for main navigation (fixed bottom)
- **Top Bar**: Use `TopBar` for current view title and global actions

### Persistence
- **LocalStorage**: Persist user preferences (`menu-position`, `theme`)
- **Events**: Use `menu-position-change` and `theme-change` custom events

## Deployment Status

✅ **Production Supabase**:
- Organization: `futeboladas`
- Project: `boladas`
- Project ID: `jqvynvxpnotjnfdxmdwj`
- URL: https://jqvynvxpnotjnfdxmdwj.supabase.co

✅ **GitHub Secrets** (Configured):
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PAGES_PROJECT`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID`
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
