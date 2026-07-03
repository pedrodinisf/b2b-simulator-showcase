#!/bin/sh
set -e

# Fail fast if a required secret is missing, instead of crash-looping inside Node.
# Add future required vars to this list.
missing=""
if [ -z "$BETTER_AUTH_SECRET" ]; then missing="$missing BETTER_AUTH_SECRET"; fi
if [ -z "$BETTER_AUTH_URL" ]; then missing="$missing BETTER_AUTH_URL"; fi
if [ -n "$missing" ]; then
	echo "[entrypoint] FATAL: missing required environment variable(s):$missing" >&2
	echo "[entrypoint] Set them in the server-side .env next to compose.yaml (see apps/web/.env.example) and retry." >&2
	exit 1
fi

# Apply DB migrations on every start; seed only when the volume is empty (see db-init.ts).
echo "[entrypoint] db-init (migrate + seed-if-empty)…"
pnpm --filter @b2bsim/web run db:init

echo "[entrypoint] starting server on ${HOST:-0.0.0.0}:${PORT:-3000}…"
cd /app/apps/web
exec node build/index.js
