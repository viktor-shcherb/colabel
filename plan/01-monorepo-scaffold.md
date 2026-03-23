# Stage 1 — Monorepo Scaffold

## Goal

Set up a Turborepo + pnpm monorepo with a single Next.js app (`apps/web`),
ready for development with Tailwind CSS, Radix UI, and TypeScript.

## Directory Structure

```
colabel/
├── apps/
│   └── web/                    # Next.js app (App Router)
│       ├── app/
│       │   ├── layout.tsx      # Root layout (html, body, providers)
│       │   ├── page.tsx        # Landing / redirect
│       │   ├── globals.css     # Tailwind imports
│       │   ├── (auth)/         # Auth pages (login callback)
│       │   ├── (app)/          # Authenticated app pages
│       │   │   ├── layout.tsx  # App shell (sidebar, header)
│       │   │   ├── projects/   # Project selection
│       │   │   ├── annotate/   # Annotation interface
│       │   │   └── stats/      # Statistics
│       │   └── api/
│       │       └── auth/       # Auth0 callback handler
│       ├── src/
│       │   ├── components/     # React components
│       │   │   └── ui/         # Base UI components (Radix wrappers)
│       │   ├── db/             # Drizzle schema + connection
│       │   ├── lib/            # Utilities, auth helpers
│       │   └── content/        # Static config
│       ├── drizzle/            # Migration files (generated)
│       ├── public/             # Static assets
│       ├── package.json
│       ├── next.config.ts
│       ├── drizzle.config.ts
│       ├── tsconfig.json
│       ├── postcss.config.mjs
│       └── .env.local.example
├── packages/                   # Shared packages (future use)
├── plan/                       # This plan
├── .ref/                       # Reference repos (gitignored)
├── package.json                # Root (turbo scripts)
├── pnpm-workspace.yaml
├── turbo.json
├── AGENTS.md
├── CLAUDE.md
├── .gitignore
└── tsconfig.json               # Root TS config (references)
```

## Steps

### 1.1 Root package.json + workspace config

- `pnpm-workspace.yaml` with `apps/*` and `packages/*`
- Root `package.json` with turbo as devDependency, scripts: `dev`, `build`, `lint`, `db:migrate`
- `turbo.json` with task pipeline (`build` depends on `^build`, `dev` is persistent)
- Env keys in turbo.json: `DATABASE_URL`, `AUTH0_*`, `UPSTASH_*`, `HF_TOKEN`, `NEXT_PUBLIC_*`

### 1.2 apps/web — Next.js app

- `npx create-next-app` or manual setup with Next.js + React 19
- App Router with `app/` directory
- TypeScript strict mode
- `@/*` path alias → `./src/*`

### 1.3 Tailwind CSS + Radix UI

- Tailwind CSS 4 with `@tailwindcss/postcss`
- `@radix-ui/themes` or individual Radix primitives
- Base `globals.css` with Tailwind directives

### 1.4 Base UI components

- Button, FormField, Card — thin Radix wrappers styled with Tailwind
- Follow jobseek pattern: `src/components/ui/`

### 1.5 Root layout

- HTML + body with font setup
- ThemeProvider (light/dark)
- Metadata config

## Acceptance Criteria

- [ ] `pnpm install` succeeds
- [ ] `pnpm dev` starts Next.js on localhost:3000
- [ ] `pnpm build` completes without errors
- [ ] Tailwind classes render correctly
- [ ] TypeScript strict mode, no errors
