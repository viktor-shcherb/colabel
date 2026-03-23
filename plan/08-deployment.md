# Stage 8 — Deployment

## Goal

Deploy to Vercel with Supabase as the database backend.
Configure environment variables, domains, and CI.

## Vercel Setup

### 1. Project Config

- Framework: Next.js (auto-detected)
- Root directory: `apps/web`
- Build command: `cd ../.. && pnpm turbo build --filter=web`
- Output: standalone mode (`next.config.ts: output: "standalone"`)

### 2. Environment Variables

Set in Vercel dashboard (or `.env.local` for dev):

```
# Supabase
DATABASE_URL=postgresql://...@db.xxx.supabase.co:5432/postgres
DATABASE_URL_UNPOOLED=postgresql://...@db.xxx.supabase.co:5432/postgres

# Auth0
AUTH0_SECRET=<random-32-chars>
AUTH0_BASE_URL=https://colabel.vercel.app
AUTH0_ISSUER_BASE_URL=https://xxx.auth0.com
AUTH0_CLIENT_ID=<from-auth0>
AUTH0_CLIENT_SECRET=<from-auth0>

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=<from-upstash>

# HuggingFace (for private datasets and export)
HF_TOKEN=hf_xxx
```

### 3. Supabase

- Create project in Supabase dashboard
- Use the "Connection string" (Transaction mode for app, Session mode for migrations)
- Run `pnpm db:migrate` against the Supabase URL before first deploy
- Enable Row Level Security if needed (optional since we do auth checks in app code)

### 4. Domain

- Configure custom domain in Vercel if desired
- Update Auth0 callback URLs to match

### 5. vercel.json

```json
{
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "buildCommand": "pnpm turbo build --filter=web"
}
```

## CI/CD

### GitHub Actions (optional)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm lint
```

## run.ai Backend (if needed)

If heavy processing is required (e.g., pre-processing datasets, running ML models
for pre-annotation), deploy a separate service on run.ai:

- Containerized Python/Node worker
- Communicates with Supabase directly
- Triggered via webhook or queue (Supabase edge functions, or polling)
- See Stage 9 for details

### 6. Upstash Redis

- Create a free Upstash Redis database
- Copy REST URL + token to Vercel env vars
- Used for: item cache (24h), session cache (15min), annotation progress (5min), rate limiting

### 7. HuggingFace

- Create HF dataset repo(s) for each project's subset
- Set `HF_TOKEN` in Vercel env vars (needed for private datasets and export)

## Acceptance Criteria

- [ ] Vercel deploy succeeds from `main` branch
- [ ] Auth0 login works on production URL
- [ ] Database connection works (Supabase)
- [ ] Redis connection works (Upstash)
- [ ] HF items load correctly in production
- [ ] Environment variables are set correctly
- [ ] Custom domain configured (if applicable)
