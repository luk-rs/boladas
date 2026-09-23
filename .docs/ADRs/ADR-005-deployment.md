# ADR-005: Deployment Strategy

**Status**: Active  
**Date**: 2026-01-22 (Updated 2026-09-23)  
**Decision Makers**: Project team

## Context
Need to deploy:
1. Frontend PWA (static assets)
2. Backend API (Cloudflare Workers)
3. Database (Supabase - managed externally)

Requirements:
- Automated deployments from Git
- Preview deployments for pull requests
- Edge distribution for low latency
- HTTPS by default
- Cost-effective hosting

## Decision

### Frontend Deployment
**Platform**: Cloudflare Pages
- Static site hosting on Cloudflare's edge network
- Automatic builds from Git pushes
- Preview URLs for each PR
- Free tier: Unlimited bandwidth

### Backend Deployment
**Platform**: Cloudflare Workers
- Deployed via `wrangler deploy`
- CI/CD through GitHub Actions
- Edge deployment to all Cloudflare POPs

### CI/CD Pipeline
**Tool**: GitHub Actions
- Trigger on push to `main` and pull requests
- Build both apps in parallel
- Deploy frontend to Cloudflare Pages with `cloudflare/wrangler-action` (`wrangler pages deploy`)
- Deploy API via Wrangler CLI

`cloudflare/pages-action` is archived. Pages direct upload uses `cloudflare/wrangler-action@v4` with the existing Cloudflare API token, account ID, and Pages project name. The action's `deployment-url` output is the deployment URL previously exposed as `pages-action`'s `url`.

## Rationale

### Cloudflare Pages for Frontend
- Native integration with Workers (same network)
- Instant global edge distribution
- Automatic preview deployments
- Zero cost for small projects
- Built-in SSL certificates

### Unified Platform Benefits
- Single CDN/edge network for app and API
- Reduced latency (co-located at edge)
- Simpler access control and routing
- One dashboard for monitoring

### GitHub Actions over Other CI
- Free for public repositories
- Native Git integration
- Extensive marketplace for actions
- Secrets management built-in

## Implementation Status

### ✅ Completed
- Monorepo build scripts (`pnpm build`)
- Wrangler configuration and GitHub Actions workflow (`deploy-workers.yml`)
- Frontend Vite build pipeline and GitHub Actions workflow (`deploy-pages.yml`) via `cloudflare/wrangler-action@v4`
- Automated production Supabase auth URL configuration (`configure-prod-auth.sh`)
- GitHub Secrets configured:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_PAGES_PROJECT`
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_DB_PASSWORD`
  - `SUPABASE_PROJECT_ID`
  - `VITE_API_URL`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Consequences

### Positive
- Fully automated deployment pipeline
- Global edge distribution (low latency)
- Preview environments for testing
- Zero infrastructure management
- Free tier covers development phase

### Negative
- Cloudflare platform lock-in
- Must manage API tokens securely
- Pages project must exist before CI runs
- Limited build time on free tier (though sufficient)

## Future Enhancements
- Add deployment status badges to README
- Configure custom domain(s)
- Set up staging environment
- Add Lighthouse CI for performance regression testing
- Implement automatic rollback on failed health checks
