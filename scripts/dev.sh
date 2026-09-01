#!/bin/bash
set -e

echo "🚀 Iniciando ambiente de desenvolvimento do Boladas..."

# 1. Ensure Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "🐳 Docker não está ativo. A iniciar Docker Desktop..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open -a Docker
  fi
  
  echo "⏳ A aguardar pelo Docker daemon..."
  while ! docker info >/dev/null 2>&1; do
    sleep 2
  done
  echo "✅ Docker pronto!"
fi

# 2. Ensure Supabase local containers are running
if ! supabase status >/dev/null 2>&1; then
  echo "📦 A iniciar Supabase local..."
  supabase start
else
  echo "✅ Supabase local já se encontra ativo."
fi

# 3. Synchronize apps/boladas/.env with local Supabase credentials
ENV_OUTPUT=$(supabase status -o env 2>/dev/null || true)
LOCAL_ANON_KEY=$(echo "$ENV_OUTPUT" | grep -E '^ANON_KEY=' | cut -d '=' -f2- | tr -d '"')

if [ -n "$LOCAL_ANON_KEY" ]; then
  APP_ENV_FILE="apps/boladas/.env"
  if [ ! -f "$APP_ENV_FILE" ] || grep -q "YOUR_ANON_KEY" "$APP_ENV_FILE" || grep -q "sb_publishable_" "$APP_ENV_FILE"; then
    echo "⚙️ A configurar $APP_ENV_FILE para o Supabase local..."
    cat <<EOF > "$APP_ENV_FILE"
VITE_API_URL=http://localhost:8787
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=$LOCAL_ANON_KEY
VITE_AUTH_ENABLED_PROVIDERS=google,azure,facebook
EOF
  fi
fi

# 4. Clean up stale processes on ports 5173 / 8787 if any
STALE_PIDS=$(lsof -ti :5173 -ti :8787 2>/dev/null || true)
if [ -n "$STALE_PIDS" ]; then
  echo "🧹 A libertar portos 5173 / 8787..."
  kill -9 $STALE_PIDS 2>/dev/null || true
fi

echo ""
echo "✨ Tudo pronto! A arrancar frontend e API com Hot Reload:"
echo "   👉 App (Vite HMR):       http://localhost:5173"
echo "   👉 API (Worker):         http://localhost:8787"
echo "   👉 Supabase Studio:      http://localhost:54323"
echo ""

# Start dev services
pnpm run dev:services
