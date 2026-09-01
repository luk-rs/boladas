# Supabase Database Migrations

## Setup for Automated Migrations

### 1. Get Your Supabase Project Details

Go to your Supabase dashboard: https://supabase.com/dashboard/project/_/settings/general

You'll need:
- **Project Reference ID** (e.g., `abcdefghijklmnop`)
- **Database Password** (the one you set when creating the project)

### 2. Generate Supabase Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Give it a name (e.g., "GitHub Actions")
4. Copy the token

### 3. Configure GitHub Secrets

Go to your repo → Settings → Secrets and variables → Actions → New repository secret

Add these three secrets:

- `SUPABASE_ACCESS_TOKEN` - Your access token from step 2
- `SUPABASE_DB_PASSWORD` - Your database password
- `SUPABASE_PROJECT_ID` - Your project reference ID

### 4. Update config.toml

Edit `supabase/config.toml` and replace `YOUR_PROJECT_REF` with your actual project reference ID.

## Migration Workflow (Free Tier Strategy - ADR-009)

Due to Supabase free tier connection constraints (10-connection limit and transaction pooler prepared statement limitations), database migrations are **NOT** run automatically during CI/CD runs.

### Deployment Process

1. Create and test migration locally:
   ```bash
   supabase migration new your_migration_name
   # edit migration file in supabase/migrations/
   supabase db reset # or supabase migration up
   ```

2. Push migrations to production database before committing:
   ```bash
   SUPABASE_PROJECT_ID=jqvynvxpnotjnfdxmdwj SUPABASE_DB_PASSWORD=your_password bash .github/scripts/push-migrations.sh
   ```

3. Commit migration files to Git and push to `main`:
   - CI builds and deploys the app safely while migrations are already live in the database.

### Local Development

- Start local stack: `supabase start`
- Stop local stack: `supabase stop`
- View local dashboard: `http://localhost:54323`

