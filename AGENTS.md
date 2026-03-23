# AGENTS.md — Colabel

Instructions for coding agents working on this repository.

## Project Overview

Colabel is a collaborative text annotation platform for research teams.
Annotators label chat conversations (primarily WildChat) with configurable
label groups. Items live on HuggingFace; only annotation diffs hit Supabase.

## Architecture: HF-Primary, DB-Lean

- **HuggingFace** — source of truth for dataset items (immutable)
- **Upstash Redis** — hot cache for items, session data, rate limiting
- **Supabase** — annotation diffs only (user, project, annotation, project_member)
- **Items never enter the database.** They are fetched from HF and cached in Redis.

## Repository Structure

```
colabel/
├── apps/web/              # Next.js frontend (App Router, TypeScript)
│   ├── app/               # Routes: (app)/, (auth)/, api/
│   ├── src/db/            # Drizzle schema (4 tables) + connection
│   ├── src/lib/           # Auth, HF client, Redis, queries, actions
│   │   └── hf/            # HuggingFace datasets API client
│   └── src/components/    # React components (ui/, annotation/, etc.)
├── packages/              # Shared packages (future)
├── plan/                  # Multi-stage implementation plan (01–10)
└── .ref/                  # Reference repos (gitignored)
```

## Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Dev server (apps/web on :3000)
pnpm build                # Production build
pnpm lint                 # Lint all packages
pnpm db:generate          # Generate Drizzle migration from schema
pnpm db:migrate           # Apply migrations to Supabase
pnpm db:studio            # Drizzle Studio (DB browser)
pnpm db:seed              # Seed projects + members from config files
pnpm hf:export            # Export annotations to HuggingFace
```

## Workflow Rules

1. **Always work in a git worktree.** Never commit directly to main.
2. **Deliverable is always a PR.** Every task produces a pull request.
3. **PRs require human review.** Never merge without approval.
4. **One concern per PR.** Keep PRs focused and reviewable.
5. **Branch naming:** `feat/<topic>`, `fix/<topic>`, `chore/<topic>`

## Git Conventions

- Commit messages: imperative mood, concise ("Add annotation page")
- Never force-push to main
- Never skip pre-commit hooks
- Rebase feature branches on main before opening PR

## Code Conventions

- TypeScript strict mode everywhere
- `@/*` imports → `apps/web/src/*`
- Server components by default; `"use client"` only when needed
- Server actions for mutations, server queries for reads
- Zod for runtime validation at boundaries
- Drizzle ORM for DB access; no raw SQL except in migrations
- Tailwind for styling; Radix UI primitives for interaction
- No `any` types; prefer `unknown` + narrowing

## Database (Supabase — keep it lean)

- Schema: `apps/web/src/db/schema.ts` — only 4 tables
- Connection: `apps/web/src/db/index.ts` (lazy Proxy singleton)
- After schema changes: `pnpm db:generate` then `pnpm db:migrate`
- Never store dataset items in DB. They belong on HuggingFace.

## Redis (Upstash)

- Item cache (24h TTL), item count (1h), progress counts (5min)
- Session cache, rate limiting
- Client: `apps/web/src/lib/redis.ts`

## Auth

- Auth0 via `@auth0/nextjs-auth0` (text-labelling-app tenant)
- Route handler: `/api/auth/[auth0]`
- Middleware protects `/projects/*`, `/annotate/*`, `/stats/*`
- Server: `getSession()` from `@/lib/auth`
- Client: `useUser()` from `@auth0/nextjs-auth0/client`

## Testing Expectations

- `pnpm build` must pass before opening PR
- `pnpm lint` must pass before opening PR
- Verify UI changes visually via dev server

## Plan Reference

Implementation plans in `plan/` (stages 01–10). Read the relevant
stage before starting work.

## Self-Improvement

When you discover a gotcha, pattern, or implicit convention, add it
here. Keep this file under 200 lines.
