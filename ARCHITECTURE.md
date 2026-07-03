# Architecture

A tour of the design decisions this project demonstrates. (Tax numbers throughout the repo are
illustrative placeholders — see the README.)

## Monorepo

A pnpm workspace with a clean dependency direction: the app depends on the packages, never the reverse.

```
packages/engine    Pure TypeScript tax engine. No DOM, no I/O, no framework. Deterministic.
packages/content   Bilingual (PT/EN) message catalogue + prose blocks. Parity is test-enforced.
apps/web           SvelteKit (adapter-node) app: SSR pages, API routes, DB, auth, email.
```

Keeping the engine framework-free means it is trivially unit-testable and could be reused from a CLI, a
worker, or a different UI without change.

## The domain engine

`simulate(params, dataset)` is a pure function returning the full set of scenarios. All arithmetic lives
here behind small helpers (`calcIRS`, `calcIRC`, …) and a single constants object. Two properties are
guarded by tests:

- **Determinism / regression lock** — golden output values are snapshotted so any accidental change in
  the maths fails a test.
- **Additivity** — later analyses (e.g. the multi-year projection) are *additive* pure functions that
  re-use the engine's output rather than editing its internals, so the core stays frozen.

The dataset (tax constants + the per-municipality table) is **injected**, not hard-wired, so a new
vintage can be loaded at runtime without a code change.

## Server-side compute

The engine and its dataset run **only on the server**. The browser sends public inputs to API routes
(`/api/simulate`, `/api/projection`, …); the server runs the engine and returns just the results. This
keeps the full rate table off the client — a deliberate data-protection boundary — and means the
compute-heavy work never ships to the browser.

## Auth + the entitlement seam

- **Passwordless auth** via Better Auth magic-link sessions. The email is delivered through a
  provider-agnostic seam whose default `log` driver simply prints the link in dev, so the whole flow is
  exercisable with no external service.
- **Entitlement seam** — premium routes call a single `requirePro(event)` guard. Today a launch flag
  makes it a no-op (everything is free); it is designed so a real entitlement check can drop in later by
  changing the guard's body only — **no route rewrites**. Authorization for user-owned data (saved
  scenarios, alert subscriptions) is always scoped to the session user, never to a client-supplied id.

## Data & i18n

- **SQLite via Drizzle ORM** (`@libsql/client`), with **committed migrations** applied idempotently on
  container start (migrate-always, seed-if-empty).
- **i18n** is a typed PT/EN catalogue. Two test suites enforce it: key-for-key **parity** between
  languages, and **content quality** (no cross-language leakage, EN-UK spelling).

## Deployment (conceptual)

The app is a container that migrates/seeds on start and publishes to a loopback port; a reverse proxy
terminates HTTPS in front of it. A few decisions worth calling out:

- **Rootless containers** — the app runs as an unprivileged user, isolated from the host.
- **Fail-fast entrypoint** — the container checks its required secrets *before* starting the server and
  exits with a clear message if any are missing, rather than crash-looping with a buried stack trace.
- **Least-privilege deploy key** — CI triggers a redeploy over SSH using a key locked to a *forced
  command* on the host; a leaked key can only run the deploy script, never open a shell.

## CI/CD

A GitHub Actions pipeline on push to `main` (`.github/workflows/deploy.yml`):

1. **CI gate** — `pnpm test`, typecheck, and build must pass.
2. **Deploy** — trigger the host redeploy over SSH.
3. **Post-deploy health check** — poll the public URL for `HTTP 200` and **fail the workflow** if it
   never comes up. `docker compose up -d` reports success as soon as a container is *created*, not once
   it is *serving* — so without this step a crash-looping release would show a green pipeline. This
   check is what turns "deployed" into "verified live".

All host, port, key and URL values come from repository secrets; the workflow itself is generic.
