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

## How It Works

- Database schema is defined in `supabase/migrations/`
- When you push to `main`, GitHub Actions automatically:
  1. Installs Supabase CLI
  2. Runs `supabase db push` to apply migrations to your hosted database
  3. Builds and deploys your app

## Manual Migration

To run migrations manually:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Creating New Migrations

When you need to change the schema:

```bash
supabase migration new your_migration_name
```

This creates a new file in `supabase/migrations/` where you can write your SQL changes.
