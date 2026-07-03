# App container: SvelteKit (adapter-node) + Playwright chromium (report PDF).
# Build context is the repo ROOT (pnpm workspace). Single stage on purpose: the runtime also
# migrates/seeds/ingests at startup, so it keeps the toolchain (tsx, drizzle migrations,
# packages/* source). Image size is dominated by chromium; keeping the toolchain is marginal.
FROM node:22-bookworm-slim

RUN corepack enable
WORKDIR /app

# 1. Copy ONLY the manifests first, so the (slow) install + chromium layers stay cached across
#    source-only changes — auto-deploys then rebuild in seconds instead of re-downloading chromium.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/engine/package.json ./packages/engine/
COPY packages/content/package.json ./packages/content/
COPY apps/web/package.json ./apps/web/

# 2. Install ALL deps (incl. tsx/drizzle used by the entrypoint) BEFORE NODE_ENV=production. The
#    prepare script (svelte-kit sync) is a no-op here — source isn't copied yet — but it has
#    `|| echo ''`, so install still succeeds.
RUN pnpm install --frozen-lockfile

# 3. Chromium (+ OS deps) for the report PDF — cached unless the dependencies change.
RUN pnpm --filter @b2bsim/web exec playwright install --with-deps chromium

# 4. Now the source (node_modules is .dockerignored, so it survives), then sync + build.
COPY . .
RUN pnpm --filter @b2bsim/web exec svelte-kit sync
RUN pnpm --filter @b2bsim/web build

# Normalise line endings (guards against a CRLF checkout) and make the entrypoint executable.
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
