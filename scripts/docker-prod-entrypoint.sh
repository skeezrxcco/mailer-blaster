#!/bin/sh
set -e

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

echo "[docker-prod] Generating Prisma client..."
npm run db:generate

if [ -d prisma/migrations ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "[docker-prod] Running Prisma migrations..."
  npx prisma migrate deploy
else
  echo "[docker-prod] No migrations found. Syncing schema with db push..."
  npm run db:push
fi

echo "[docker-prod] Starting Next.js server..."
exec npm run start -- --hostname 0.0.0.0 --port 3000
