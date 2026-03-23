# Colabel — Migration Plan Overview

## What We're Building

Colabel is a collaborative text annotation platform for research teams.
Users log in, select a project, read annotation instructions, label text items
(chat conversations from WildChat), and view progress statistics.

The original app (Python/Streamlit) stored both datasets and annotations in Git
repos as JSONL files. The new version uses HuggingFace as primary dataset/annotation
storage and Supabase only for lightweight annotation diffs and user management.

## Source App

- **Repo**: github.com/viktor-shcherb/text-labelling (cloned at `.ref/text-labelling`)
- **Key concepts**: Projects, Items (chat conversations), Annotations (per-user labels),
  LabelGroups (single/multi-choice), versioned project configs

## Target Stack

| Layer            | Technology                               |
| ---------------- | ---------------------------------------- |
| Framework        | Next.js (App Router) + React + TypeScript |
| Auth             | Auth0 (reuse text-labelling-app tenant)  |
| Database         | Supabase (PostgreSQL) — diffs only       |
| ORM              | Drizzle ORM + drizzle-kit migrations     |
| Cache            | Upstash Redis (item cache, session, rate limit) |
| Dataset storage  | HuggingFace Datasets                     |
| UI               | Tailwind CSS + Radix UI                  |
| Monorepo         | Turborepo + pnpm workspaces              |
| Hosting          | Vercel (web) + run.ai (if backend needed) |

## Architecture: HF-Primary, DB-Lean

```
┌──────────────┐     reads items      ┌──────────────────┐
│  HF Dataset  │◄─────────────────────│    Colabel App   │
│  (immutable) │                      │    (Next.js)     │
└──────────────┘                      └────────┬─────────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          │ writes diffs       │ caches items       │
                   ┌──────▼──────┐      ┌──────▼──────┐            │
                   │  Supabase   │      │   Upstash   │            │
                   │  (tiny DB)  │      │   Redis     │            │
                   └─────────────┘      └─────────────┘            │
                          │ periodic export                        │
                   ┌──────▼──────┐                                 │
                   │  HF Output  │                                 │
                   │  Dataset    │                                 │
                   └─────────────┘
```

- **Items never enter Supabase.** They are fetched from HF datasets API and cached in Redis.
- **Supabase stores only:** users, projects (config), project_members, annotations (labels only).
- **Annotations are exported** to HF periodically or on-demand.

## Plan Stages

| #  | File                        | Scope                                    |
| -- | --------------------------- | ---------------------------------------- |
| 00 | `00-dev-setup.md`           | Zero-to-running: Node, Supabase, Auth0, Redis, HF |
| 01 | `01-monorepo-scaffold.md`   | Turborepo, pnpm workspace, base configs  |
| 02 | `02-database-schema.md`     | Drizzle schema (lean), Supabase setup    |
| 03 | `03-auth.md`                | Auth0 integration, session management    |
| 04 | `04-data-layer.md`          | HF client, Redis cache, server actions   |
| 05 | `05-project-management.md`  | Git-based project config, project pages  |
| 06 | `06-annotation-ui.md`       | Core annotation interface + components   |
| 07 | `07-statistics.md`          | Progress tracking, annotation statistics |
| 08 | `08-deployment.md`          | Vercel config, env vars, CI/CD           |
| 09 | `09-future.md`              | run.ai backend, real-time, extensions    |
| 10 | `10-hf-export.md`           | Annotation export to HuggingFace         |
| 11 | `11-data-migration.md`      | Migrate old Git/JSONL data to HF + Supabase |
