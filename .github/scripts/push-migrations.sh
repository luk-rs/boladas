#!/bin/bash
# Manual database migration script for Supabase production
# Run this locally when you have new migrations: bash .github/scripts/push-migrations.sh
# 
# This avoids free tier connection pool exhaustion by keeping migrations out of CI.
# The Supabase free tier has a 10-connection limit, and running migrations in CI
# repeatedly can exhaust connections due to pooler prepared statement issues.

set -e

if [ -z "$SUPABASE_PROJECT_ID" ]; then
  echo "❌ Error: SUPABASE_PROJECT_ID environment variable not set"
  echo "Set your Supabase project ID and try again:"
  echo "  export SUPABASE_PROJECT_ID=your_project_id"
  exit 1
fi

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "❌ Error: SUPABASE_DB_PASSWORD environment variable not set"
  echo "Set your Supabase database password and try again:"
  echo "  export SUPABASE_DB_PASSWORD=your_password"
  exit 1
fi

echo "📦 Pushing migrations to Supabase project: $SUPABASE_PROJECT_ID"
echo ""

# Use pooler connection (port 6543) for IPv4 compatibility
# Direct connection (port 5432) requires IPv6 which may not be available
DB_URL="postgresql://postgres.$SUPABASE_PROJECT_ID:$SUPABASE_DB_PASSWORD@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

supabase db push --db-url "$DB_URL"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migrations pushed successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Test your changes in production"
  echo "2. Commit your migration files to git"
  echo "3. Push to main - CI will deploy the app (without re-running migrations)"
else
  echo ""
  echo "❌ Migration push failed. Check the error above and try again."
  exit 1
fi
