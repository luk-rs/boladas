# ADR-015: Automated Production Auth Configuration

**Status:** Accepted  
**Date:** 2026-01-25  
**Deciders:** Engineering Team

## Context

When deploying to production, users were being redirected to `localhost:3000` after Google OAuth login instead of the production URL (https://boladas.pages.dev). This occurred because Supabase's Site URL setting was manually configured to a localhost address and not updated when deploying to production.

The issue manifested as:
- Production users stuck on loading screen
- OAuth callback redirecting to localhost instead of production domain
- Manual dashboard configuration required after each environment change

## Decision

We will automate the configuration of Supabase auth settings via CI/CD:

1. **Management API Integration**: Use Supabase Management API to programmatically configure auth URLs
2. **CI/CD Script**: Add `.github/scripts/configure-prod-auth.sh` to set production URLs on deployment
3. **Environment Separation**: 
   - Local dev uses `supabase/config.toml` (localhost:5173)
   - Production uses CI-configured URLs via Management API
4. **Production-Only Redirects**: Production config excludes localhost URLs for security

## Implementation

### CI/CD Integration
The deployment workflow automatically configures auth URLs **after** deployment:
```yaml
- name: Deploy to Cloudflare Pages
  id: deploy
  uses: cloudflare/pages-action@v1
  ...

- name: Configure Supabase auth URLs
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
    PRODUCTION_URL: ${{ steps.deploy.outputs.url }}
  run: bash .github/scripts/configure-prod-auth.sh
```

The production URL is automatically detected from the Cloudflare Pages deployment output, eliminating the need for manual configuration.

### Configuration Applied
- **Site URL**: Set to `$PRODUCTION_URL`
- **Allowed Redirect URLs**: `$PRODUCTION_URL/**` only (no localhost in production)

## Consequences

### Positive
- ✅ No manual dashboard configuration needed
- ✅ Production auth URLs always correct on deployment
- ✅ Clear separation between dev and prod config
- ✅ Reduces deployment errors and manual steps
- ✅ Production config excludes development URLs
- ✅ No additional secrets required - uses deployment URL automatically

### Negative
- ⚠️ Relies on Supabase Management API availability
- ⚠️ API token must have proper permissions
- ⚠️ Auth config happens after deployment (brief window where URLs might be incorrect)

## Alternatives Considered

### 1. Manual Dashboard Configuration
**Rejected**: Error-prone, requires manual steps, easy to forget

### 2. Environment Variables in Build
**Rejected**: Site URL is a Supabase project setting, not build-time config

### 3. Terraform/IaC
**Rejected**: Overkill for current project size, adds complexity

## Related
- [ADR-004: Database](./ADR-004-database.md) - Supabase as primary database
- [ADR-005: Deployment](./ADR-005-deployment.md) - Deployment strategy
- [ADR-007: Developer Experience](./ADR-007-developer-experience.md) - Local development setup
