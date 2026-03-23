# Stage 2 — Database Schema (Lean)

## Goal

Design a minimal Drizzle ORM schema for Supabase. The database stores only
annotation diffs and user/project metadata. Dataset items live on HuggingFace.

## Design Principle: DB-Lean

Supabase free/pro tiers have limited DB size. We minimize storage by:
- **No `item` table** — items are fetched from HF at runtime, cached in Redis
- **No `project_version` table** — versioning handled by HF dataset repos
- **Annotations reference items by index** — `(project_id, item_index)` not FK

## Connection Setup

Follow the jobseek Proxy singleton pattern (`src/db/index.ts`):
- Lazy initialization via `globalThis` cache
- Support `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (migrations)
- Use `postgres` driver (postgres.js)

## Schema

### user (synced from Auth0 on login)

```
user
  id            text PK                -- Auth0 sub (e.g., "auth0|abc123")
  email         text UNIQUE NOT NULL
  name          text
  image         text                   -- avatar URL from Auth0
  role          text DEFAULT 'annotator'  -- 'admin' | 'annotator'
  created_at    timestamp
  updated_at    timestamp
```

### project (small config — no dataset content)

```
project
  id            uuid PK DEFAULT random
  slug          text UNIQUE NOT NULL
  name          text NOT NULL
  description   text
  task_type     text NOT NULL DEFAULT 'chat'
  instructions  text                   -- markdown
  config        jsonb NOT NULL DEFAULT '{}'
  is_active     boolean DEFAULT true
  created_at    timestamp
  updated_at    timestamp
```

`config` stores:
```json
{
  "hf_dataset": "viktor-shcherb/colabel-wildchat-subset",
  "hf_config": "default",
  "hf_split": "train",
  "item_count": 500,
  "chat_options": { "annotate_roles": ["assistant"] },
  "label_groups": {
    "quality": { "title": "Quality", "single_choice": true, "labels": ["good", "bad"] },
    "safety":  { "title": "Safety",  "single_choice": false, "labels": ["safe", "unsafe", "borderline"] }
  }
}
```

### annotation (the diffs — labels only, no item content)

```
annotation
  id            uuid PK DEFAULT random
  project_id    uuid FK → project.id CASCADE
  user_id       text FK → user.id CASCADE
  item_index    integer NOT NULL        -- row index in the HF dataset
  labels        jsonb NOT NULL          -- per-message label array
  created_at    timestamp
  updated_at    timestamp
  UNIQUE(project_id, user_id, item_index)
  INDEX(user_id)
  INDEX(project_id, item_index)
```

### project_member (access control)

```
project_member
  id            uuid PK DEFAULT random
  project_id    uuid FK → project.id CASCADE
  user_id       text FK → user.id CASCADE
  role          text DEFAULT 'annotator'  -- 'admin' | 'annotator'
  invited_at    timestamp
  UNIQUE(project_id, user_id)
```

## DB Size Estimate

For a typical research project (500 items, 5 annotators):
- `annotation`: 2,500 rows × ~200 bytes = ~500 KB
- `project`: 1 row × ~2 KB = ~2 KB
- `user` + `project_member`: negligible
- **Total: under 1 MB**

Even with 50 projects and 50 annotators: well under 100 MB.

## Migration Setup

- `drizzle.config.ts` pointing to `./src/db/schema.ts`
- Output to `./drizzle/` directory
- Scripts: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:studio`

## Acceptance Criteria

- [ ] `pnpm db:generate` produces migration SQL
- [ ] `pnpm db:migrate` applies to Supabase without errors
- [ ] `pnpm db:studio` shows all 4 tables
- [ ] TypeScript types match schema (inferred via Drizzle)
- [ ] Total DB size stays under 10 MB for typical usage
