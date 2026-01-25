#!/bin/bash

# Start Supabase
echo "Starting Supabase..."
supabase start

# Trap SIGINT and SIGTERM to stop Supabase on exit
trap 'echo "Stopping Supabase..."; supabase stop; exit' INT TERM

# Start dev services
pnpm run dev:services
