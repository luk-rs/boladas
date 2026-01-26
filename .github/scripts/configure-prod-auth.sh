#!/bin/bash
# Configure production Supabase auth settings via Management API
# This should be run after migrations in CI/CD

set -e

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN is required"
  exit 1
fi

if [ -z "$SUPABASE_PROJECT_ID" ]; then
  echo "❌ SUPABASE_PROJECT_ID is required"
  exit 1
fi

if [ -z "$PRODUCTION_URL" ]; then
  echo "❌ PRODUCTION_URL is required (e.g., https://boladas.pages.dev)"
  exit 1
fi

if [ -z "$GOOGLE_CLIENT_ID" ]; then
  echo "❌ GOOGLE_CLIENT_ID is required"
  exit 1
fi

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "❌ GOOGLE_CLIENT_SECRET is required"
  exit 1
fi

echo "🔧 Configuring auth settings for project: $SUPABASE_PROJECT_ID"
echo "📍 Site URL: $PRODUCTION_URL"
echo "🔐 Configuring Google OAuth provider"

# Update auth configuration via Management API
# Includes site URLs and Google OAuth credentials
curl -X PATCH \
  "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_ID/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "SITE_URL": "'"$PRODUCTION_URL"'",
    "URI_ALLOW_LIST": "'"$PRODUCTION_URL"'/**",
    "EXTERNAL_GOOGLE_ENABLED": true,
    "EXTERNAL_GOOGLE_CLIENT_ID": "'"$GOOGLE_CLIENT_ID"'",
    "EXTERNAL_GOOGLE_SECRET": "'"$GOOGLE_CLIENT_SECRET"'"
  }'

echo ""
echo "✅ Auth configuration updated successfully"
