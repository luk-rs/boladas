# ADR-005: Deployment Strategy

**Status**: Active (Pending Configuration)  
**Date**: 2026-01-22  
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
- Deploy frontend to Cloudflare Pages
- Deploy API via Wrangler CLI

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
- Wrangler configuration
- Frontend Vite build pipeline

### ⚠️ Pending Configuration
The following must be configured in GitHub repository settings:

**Required Secrets**:
1. `CLOUDFLARE_API_TOKEN`
   - Create at: Cloudflare Dashboard → My Profile → API Tokens
   - Required permissions:
     - Account → Workers Scripts → Edit
     - Account → Cloudflare Pages → Edit
     - User → User Details → Read (recommended)

2. `CLOUDFLARE_ACCOUNT_ID`
   - Found at: Cloudflare Dashboard → Workers & Pages → Account ID

3. `CLOUDFLARE_PAGES_PROJECT`
   - Value: `boladas` (suspected from project context)
   - Must match project name created in Cloudflare Pages

**Setup Steps**:
1. Create Cloudflare Pages project named `boladas`
2. Generate API token with required permissions
3. Add all three secrets to GitHub repository
4. Push to main to trigger first deployment

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
