# B2B Simulator — Portugal contractor tax comparison
<img width="1558" height="924" alt="image" src="https://github.com/user-attachments/assets/37cd427a-a67d-44fc-81db-aee641ec9958" />

A bilingual (**PT-PT / EN-UK**) web app that compares how a Portuguese independent contractor can
operate — sole trader (*ENI*) vs single-member private limited company (*Unipessoal Lda.*) — and
computes per-scenario net take-home, multi-year projections, and more.

This repository is a **portfolio / showcase build**: the full application architecture, tooling and
CI/CD are real and runnable, but the tax rates and datasets are placeholders (see below).

> ### ⚠️ Illustrative data
> Every tax rate, bracket, threshold and municipal figure in this repo is a **made-up round number**,
> present only so the app runs and the demo is coherent. **They are not real Portuguese tax figures and
> must never be used for an actual calculation.** The production instance uses a separately-maintained,
> source-cited dataset that is not part of this repository.

## What this repository demonstrates

- **A pnpm monorepo** — a pure, framework-free TypeScript domain engine (`packages/engine`), a
  content/i18n package (`packages/content`), and a SvelteKit app (`apps/web`) that consumes both.
- **Server-side compute** — the tax engine and its dataset run only on the server; the browser posts
  public inputs to API routes and renders the result. The rate table never reaches the client.
- **Passwordless auth + an entitlement seam** — Better Auth magic-link sessions, and a `requirePro()`
  guard designed so a real entitlement check can drop in later with no route rewrites.
- **Deterministic, tested domain logic** — the engine is a pure function with a golden-value regression
  lock; i18n parity and content-quality are enforced by tests.
- **Production-shaped CI/CD** — a GitHub Actions pipeline (test → typecheck → build → deploy) with a
  **fail-fast container entrypoint** and a **post-deploy health check**, so a broken release fails the
  workflow instead of silently going live. See [ARCHITECTURE.md](./ARCHITECTURE.md).

## Tech stack

| Layer | Choice |
|---|---|
| App framework | SvelteKit (Svelte 5 runes) + `adapter-node`, SSR |
| Language | TypeScript throughout, strict |
| Domain engine | Framework-free TS, unit-tested (Vitest) |
| Data | SQLite via Drizzle ORM + `@libsql/client`, committed migrations |
| Auth | Better Auth (magic-link) |
| i18n | Custom PT/EN catalogue with parity + quality tests |
| Tooling | pnpm workspaces, Vitest, Playwright, Docker, GitHub Actions |

## Architecture at a glance

```
packages/engine    Pure TS tax engine (types, constants, simulate, projection) — no DOM, no I/O
packages/content   Bilingual message catalogue + prose content, with parity/quality tests
apps/web           SvelteKit app: SSR UI + API routes + Drizzle/SQLite + auth + email seam
```

Full write-up (server-side-compute rationale, the entitlement seam, deployment, CI/CD): **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

> Note: several source comments reference an original single-file `index.html` prototype the app was refactored from; that prototype is not part of this repository.

## Running locally

```bash
pnpm install
pnpm --filter @b2bsim/web db:setup   # generate + seed the local SQLite DB (sample data)
pnpm --filter @b2bsim/web dev        # http://localhost:5173
```

Auth and email work out of the box in dev via a `log` driver that prints the magic-link/email to the
console — no external provider needed. Copy `apps/web/.env.example` to `apps/web/.env` to configure real
providers.

## Tests, typecheck, build

```bash
pnpm test                              # engine regression, i18n parity/quality, auth, CRUD, alerts
pnpm --filter @b2bsim/web typecheck
pnpm --filter @b2bsim/web build
```

## License

See [LICENSE](./LICENSE). Source-available for review; not licensed for reuse.
