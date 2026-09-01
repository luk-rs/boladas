# ADR-007: Developer Experience and Local Development

**Status**: Active  
**Date**: 2026-01-22 (Updated 2026-09-01)  
**Decision Makers**: Project team

## Context
Need a streamlined local development environment that:
- Minimizes setup friction for developers
- Provides fast feedback loops
- Mirrors production environment closely
- Works consistently across different machines
- Supports debugging and testing workflows

## Decision

### Local Development Stack
**Supabase CLI** (Industry Standard & Official Setup)
- Standard Supabase CLI managing local Postgres, GoTrue Auth, PostgREST, Realtime, Inbucket, and Studio UI.
- Containers grouped under project ID `futeboladas-boladas`.
- Local API on `http://localhost:54321` and Studio on `http://localhost:54323`.
- `docker-compose.yml` remains in repository strictly for self-hosting/reference scenarios (do not use for active development).

### Development Orchestration
**Tool**: `scripts/dev.sh` and root pnpm scripts
- Single command: `pnpm dev` (starts `supabase start` and parallel dev servers via `dev:services`).
- Signal trapping on SIGINT/SIGTERM to cleanly stop Supabase on exit.

### IDE Configuration
**Primary**: VS Code (`.vscode/` directory)
- Recommended extensions for TypeScript, ESLint, Prettier
- Pre-configured tasks and launch configurations for API and App

### TypeScript Configuration
**Shared base config** (`tsconfig.base.json`)
- Strict mode enabled across all workspaces
- ES2022 target for modern features
- Bundler module resolution (Vite/Wrangler compatible)

## Implementation Details

### Quick Start
```bash
# Clone and install
git clone <repo>
cd boladas
pnpm install

# Start full stack (Supabase CLI + API + App)
pnpm dev

# Or run individually
pnpm dev:app    # Frontend on :5173
pnpm dev:api    # API on :8787
supabase start  # Local Supabase stack
```

### Environment Variables

#### App `.env` (`apps/boladas/.env`)
Configured for local Supabase CLI:
```bash
VITE_API_URL=http://localhost:8787
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<local-supabase-anon-key>
VITE_AUTH_ENABLED_PROVIDERS=google,azure,facebook
```

**Note**: Never commit `.env` files (in `.gitignore`).

### Development Scripts

#### Root Package Scripts
```bash
pnpm dev          # Full stack: starts Supabase CLI + API + App
pnpm dev:services # Starts API and App in parallel
pnpm dev:app      # Frontend only (Vite on :5173)
pnpm dev:api      # API only (Wrangler on :8787)
pnpm build        # Build all apps
pnpm lint         # Typecheck + architecture lint
pnpm typecheck    # TypeScript compiler check
```

#### Scripts
- `scripts/dev.sh`: Starts Supabase with `supabase start`, handles cleanup traps on exit, and runs `pnpm dev:services`.

### VS Code Configuration

#### Extensions (`.vscode/extensions.json`)
Recommended:
- `dbaeumer.vscode-eslint` (future-proofing)
- `esbenp.prettier-vscode` (future-proofing)
- `ms-vscode.vscode-typescript-next` (latest TS features)

#### Launch Configurations (`.vscode/launch.json`)
- **"Open Boladas App"**: Launch Chrome at localhost:5173
- **"Dev: API + App"**: Compound config (starts app + opens browser)

#### Tasks (`.vscode/tasks.json`)
- Dev: API - Start Wrangler dev server
- Dev: App - Start Vite dev server
- Build: API - Dry-run Wrangler deployment
- Build: App - Production Vite build

### Hot Module Replacement (HMR)
- **Frontend**: Vite HMR (instant React updates)
- **API**: Wrangler watches for changes, auto-reloads Workers

### PWA Development
- Service worker enabled in dev mode via Vite PWA config
- App name shows as "Boladas.dev" in development
- Allows testing offline capabilities locally

## Rationale

### Self-hosted Supabase over Cloud
- **Pros**:
  - Work offline or without internet
  - No API rate limits during development
  - Full control over data and auth config
  - Free (no usage costs)
  - Fast iteration (no network latency)
- **Cons**:
  - Docker required on developer machine
  - Initial setup complexity (mitigated by scripts)
  - Must manage local database state

### Docker Compose over Manual Setup
- Single `docker compose up` command
- Reproducible environment (no "works on my machine")
- Matches production Supabase architecture
- Easy to reset (delete volumes)

### Custom Scripts over Manual Config
- Eliminates copy-paste errors
- Auto-generates secure secrets (no weak passwords)
- Idempotent (safe to re-run)
- Self-documenting (read the script to understand setup)

### VS Code Configuration
- Most popular editor in JavaScript ecosystem
- Excellent TypeScript and debugging support
- Configuration is optional (works without VS Code)
- Extensions are recommendations, not requirements

### Shared TypeScript Config
- Consistency across all workspaces
- Single source of truth for compiler options
- Apps can override specific settings (e.g., `jsx` for React)
- Strict mode catches more bugs

## Consequences

### Positive
- New developer onboarding: ~5 minutes (pnpm install + pnpm dev)
- No external service dependencies for core development
- Fast feedback loop (HMR in both frontend and backend)
- Production-like environment (same Supabase services)
- Easy database reset: `docker compose down -v && pnpm dev`
- IDE support works out of the box

### Negative
- Docker required (not trivial on some systems)
- Docker services consume ~2GB RAM
- Local Supabase differs slightly from hosted (versions may lag)
- Need to understand Docker Compose for debugging infrastructure issues
- Windows developers may need WSL2 for best Docker performance

## Future Enhancements
- Add `.devcontainer` for GitHub Codespaces / Remote Containers
- Create `pnpm test` command with test runners
- Add database migration tooling (currently manual SQL files)
- Set up pre-commit hooks with Husky (lint, typecheck)
- Add Prettier and ESLint configurations
- Create `pnpm seed:reset` to reload seed data without Docker restart
- Add health check script to verify all services are running
- Document debugging Workers locally with Chrome DevTools

## Troubleshooting

### Common Issues

**Docker containers won't start**
```bash
# Check if ports are already in use
lsof -i :8000 -i :5173 -i :8787

# Reset Docker state
docker compose down -v
pnpm dev
```

**Database schema out of sync**
```bash
# Rebuild database with latest schema
docker compose down -v
pnpm dev  # Will reload schema from supabase/schema.sql
```

**Environment variables missing**
```bash
# Regenerate .env files
rm .env apps/boladas/.env
pnpm dev  # setup-dev.mjs will recreate them
```

**HMR not working**
- Check if file watcher limits exceeded (Linux: `fs.inotify.max_user_watches`)
- Restart dev server
- Clear browser cache and service worker

## Security Notes
- `.env` files contain secrets - **NEVER commit them**
- Local `JWT_SECRET` is different from production
- Use `SERVICE_ROLE_KEY` sparingly (bypasses RLS)
- Local database is accessible without password on localhost:5432
- Development mode has auth auto-confirm enabled (no email verification)
