#!/bin/sh
set -e

if [ ! -d node_modules ] || [ ! -f node_modules/.package-lock.json ]; then
  echo "[docker-dev] Installing dependencies..."
  npm ci
elif ! cmp -s package-lock.json node_modules/.package-lock.json; then
  echo "[docker-dev] package-lock changed. Reinstalling dependencies..."
  npm ci
fi

echo "[docker-dev] Generating Prisma client..."
npm run db:generate

echo "[docker-dev] Syncing database schema..."
npm run db:push

echo "[docker-dev] Starting Next.js dev server..."
exec npm run dev -- --hostname 0.0.0.0 --port 3000
