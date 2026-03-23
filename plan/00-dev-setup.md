# Dev Setup — Zero to Running App

This guide takes you from a fresh machine to a running Colabel dev environment.

## Prerequisites

- macOS (or Linux)
- Git
- A browser

---

## 1. Install Node.js + pnpm

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Restart terminal, then:
nvm install 22
nvm use 22
node --version   # should print v22.x.x

# Enable corepack (ships pnpm)
corepack enable
corepack prepare pnpm@10.6.0 --activate
pnpm --version   # should print 10.6.0
```

---

## 2. Clone & Install

```bash
git clone https://github.com/viktor-shcherb/colabel.git
cd colabel
pnpm install
```

Verify:
```bash
pnpm build   # should complete without errors
```

---

## 3. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → sign in (GitHub login works)
2. Click **New Project**
   - Name: `colabel`
   - Region: closest to your team (e.g., `eu-central-1`)
   - Generate a database password → **save it**
3. Once created, go to **Settings → Database**
4. Copy two connection strings:
   - **Transaction mode** (port 6543) → use as `DATABASE_URL`
   - **Session mode** (port 5432) → use as `DATABASE_URL_UNPOOLED`

   Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:[port]/postgres`

---

## 4. Create Upstash Redis

1. Go to [upstash.com](https://upstash.com) → sign in
2. Click **Create Database**
   - Name: `colabel`
   - Region: same region as Supabase
   - Type: **Regional** (not Global, to save cost)
3. Once created, copy:
   - **REST URL** → `UPSTASH_REDIS_REST_URL`
   - **REST Token** → `UPSTASH_REDIS_REST_TOKEN`

Both are on the database detail page under "REST API".

---

## 5. Configure Auth0

We reuse the existing `text-labelling-app` Auth0 tenant.

### 5a. Create a new Application (or reuse existing)

1. Go to [manage.auth0.com](https://manage.auth0.com)
2. Switch to the **text-labelling-app** tenant (top-left dropdown)
3. Go to **Applications → Applications → Create Application**
   - Name: `Colabel`
   - Type: **Regular Web Application**
4. In the application settings:
   - **Allowed Callback URLs:**
     ```
     http://localhost:3000/api/auth/callback
     ```
   - **Allowed Logout URLs:**
     ```
     http://localhost:3000
     ```
   - **Allowed Web Origins:**
     ```
     http://localhost:3000
     ```
5. Save changes
6. Copy from the **Settings** tab:
   - **Domain** → becomes `AUTH0_ISSUER_BASE_URL` (prefix with `https://`)
   - **Client ID** → `AUTH0_CLIENT_ID`
   - **Client Secret** → `AUTH0_CLIENT_SECRET`

### 5b. Verify Google Connection

1. Go to **Authentication → Social** in the Auth0 dashboard
2. Confirm **Google / Gmail** is enabled
3. If not: click it → toggle on → use Auth0's dev keys for local dev
   (or configure your own Google OAuth credentials for production)

### 5c. Generate AUTH0_SECRET

```bash
openssl rand -hex 32
```

Copy the output → `AUTH0_SECRET`

---

## 6. HuggingFace Token

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Click **New token**
   - Name: `colabel`
   - Type: **Fine-grained**
   - Permissions: **Read** (for accessing datasets) + **Write** (for export)
3. Copy the token → `HF_TOKEN`

If working with public datasets only, this can be skipped for now
(private datasets and export require it).

---

## 7. Create .env.local

```bash
cd apps/web
cp .env.local.example .env.local
```

Fill in all values:

```bash
# Supabase
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
DATABASE_URL_UNPOOLED=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Auth0
AUTH0_SECRET=<output-of-openssl-rand>
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://<tenant>.auth0.com
AUTH0_CLIENT_ID=<from-auth0-dashboard>
AUTH0_CLIENT_SECRET=<from-auth0-dashboard>

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://<id>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<from-upstash-dashboard>

# HuggingFace
HF_TOKEN=hf_<your-token>
```

---

## 8. Run Database Migrations

```bash
# From repo root
pnpm db:generate    # Generate migration SQL from schema
pnpm db:migrate     # Apply to Supabase
```

Verify by opening Drizzle Studio:
```bash
pnpm db:studio
```
You should see 4 tables: `user`, `project`, `annotation`, `project_member`.

---

## 9. Seed Data (once projects are configured)

```bash
pnpm db:seed
```

This reads project configs from `apps/web/src/content/projects/` and
upserts them into the `project` table.

---

## 10. Start Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

You should see the login page. Click "Log in" → Auth0 → Google → redirected
back to the projects page.

---

## Troubleshooting

### `pnpm install` fails
- Make sure you're using Node 22+ and pnpm 10+
- Delete `node_modules` and `pnpm-lock.yaml`, retry

### Auth0 callback error
- Check that `http://localhost:3000/api/auth/callback` is in Allowed Callback URLs
- Check `AUTH0_ISSUER_BASE_URL` starts with `https://`
- Check `AUTH0_BASE_URL` is `http://localhost:3000` (no trailing slash)

### Supabase connection refused
- Check that `DATABASE_URL` uses port 6543 (transaction mode)
- Check that `DATABASE_URL_UNPOOLED` uses port 5432 (session mode)
- Check the password doesn't contain unescaped special characters

### Redis connection error
- Verify the REST URL starts with `https://`
- The token is the full string from the Upstash dashboard (not the password)

### HF API returns 401
- Set `HF_TOKEN` if accessing private datasets
- For public datasets, requests work without a token

### `pnpm db:migrate` fails
- Use `DATABASE_URL_UNPOOLED` (session mode, port 5432) — migrations need it
- The `drizzle.config.ts` already prefers `DATABASE_URL_UNPOOLED`

---

## Production Setup

For deploying to Vercel, see `plan/08-deployment.md`. The main differences:
- Set all env vars in Vercel dashboard (not `.env.local`)
- Update Auth0 callback URLs to the production domain
- Use Supabase production connection strings (not local)
