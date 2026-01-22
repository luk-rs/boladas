# ADR-001: Monorepo Structure with pnpm Workspaces

**Status**: Active  
**Date**: 2026-01-22  
**Decision Makers**: Project team

## Context
The boladas project requires both a frontend application and a backend API. Managing these as separate repositories would introduce overhead in coordination, versioning, and shared configuration.

## Decision
Use a pnpm workspace-based monorepo structure with the following organization:

```
boladas/
├── apps/
│   ├── boladas/    # Frontend PWA
│   └── api/        # Backend API
├── supabase/       # Database schema
└── pnpm-workspace.yaml
```

### Package Manager
- **Tool**: pnpm v9.15.0
- **Reason**: Superior disk efficiency, faster installs, strict dependency resolution, excellent workspace support

### Workspace Configuration
- All applications located in `apps/*`
- Shared scripts at root level for coordinated development
- Independent deployment configurations per app

## Consequences

### Positive
- Simplified dependency management across projects
- Easy code sharing if needed in the future
- Single command execution for all workspaces (`pnpm build`, `pnpm lint`)
- Atomic commits across frontend and backend changes
- Consistent tooling and Node version (>=20.0.0)

### Negative
- Slightly more complex initial setup
- All contributors must use pnpm (enforced by `packageManager` field)
- Single repository means issues/PRs are not separated by concern

## Implementation
- Root `package.json` defines workspace scripts
- `pnpm-workspace.yaml` declares workspace pattern
- Each app maintains independent `package.json`
- Package manager pinned to pnpm@9.15.0
