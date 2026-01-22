# ADR-006: Code Quality and Type Checking

**Status**: Active  
**Date**: 2026-01-22  
**Decision Makers**: Project team

## Context
Need consistent code quality standards across the monorepo to:
- Catch bugs before runtime
- Maintain code consistency
- Improve developer experience
- Facilitate code reviews

## Decision

### Type Checking
**Tool**: TypeScript 5.7.3
- Enabled in both frontend and backend
- Separate `tsconfig.json` per application
- Strict mode for maximum type safety

### Linting Strategy
**Current**: TypeScript compiler (`tsc --noEmit`)
- Frontend lint: `pnpm -C apps/boladas lint`
- Backend lint: `pnpm -C apps/api lint`
- Root script: `pnpm lint` (runs both)

**Note**: Currently using `tsc` for linting (type checking only, no style enforcement)

### Quality Scripts
All quality checks available at root level:
```bash
pnpm lint        # Type check all workspaces
pnpm typecheck   # Explicit type checking (same as lint)
pnpm build       # Validates build succeeds
```

## Rationale

### TypeScript Over JSDoc
- First-class type support (not comments)
- Better IDE integration
- More robust refactoring tools
- Industry standard for new projects

### tsc for Linting
- **Pros**:
  - Zero configuration needed
  - Catches actual type errors
  - No extra dependencies
  - Fast execution
- **Cons**:
  - No code style enforcement (formatting, naming, etc.)
  - Doesn't catch non-type issues (unused vars handled by TS)

### No ESLint/Prettier (Yet)
- Current approach is minimal and sufficient for early development
- Can add later if team grows or style consistency becomes an issue
- Reduces initial configuration overhead

## Consequences

### Positive
- Catches type errors before runtime
- Consistent type checking across workspaces
- Simple, easy-to-understand tooling
- Fast CI pipeline (just `pnpm lint && pnpm build`)

### Negative
- No automated code formatting enforcement
- No advanced linting rules (e.g., React hooks, accessibility)
- Developers might have different formatting preferences
- No auto-fix capabilities

## Implementation
- TypeScript configured per app in `apps/*/tsconfig.json`
- Workspace root aggregates lint/typecheck commands
- Each app's `package.json` defines local scripts
- No pre-commit hooks (yet)

## Future Considerations
- Add ESLint + `@typescript-eslint` if team grows beyond 2-3 developers
- Add Prettier for consistent formatting
- Consider Biome as all-in-one linter/formatter
- Add pre-commit hooks with Husky if quality issues arise
- Configure editor settings (`.vscode/settings.json`) for consistency
