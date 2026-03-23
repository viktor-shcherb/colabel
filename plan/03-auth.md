# Stage 3 — Authentication (Auth0)

## Goal

Integrate Auth0 for authentication with Google login built-in.
Sync Auth0 users to the local `user` table on first login.

## Why Auth0 (not better-auth)

- Google login is built-in, no separate OAuth app registration needed
- Enterprise-ready (SSO, MFA) without extra code
- The original text-labelling app already uses Auth0

## Auth0 Setup

### 1. Auth0 Application Config

- Reuse existing `text-labelling-app` Auth0 tenant
- Create a new "Regular Web Application" within that tenant (or reuse existing)
- Google social connection is already enabled
- Set callback URLs:
  - Dev: `http://localhost:3000/api/auth/callback`
  - Prod: `https://colabel.vercel.app/api/auth/callback`

### 2. Environment Variables

```
AUTH0_SECRET          # Random 32+ char secret for session encryption
AUTH0_BASE_URL        # App base URL (http://localhost:3000)
AUTH0_ISSUER_BASE_URL # Auth0 tenant URL (https://xxx.auth0.com)
AUTH0_CLIENT_ID       # From Auth0 dashboard
AUTH0_CLIENT_SECRET   # From Auth0 dashboard
```

### 3. Next.js Integration

Use `@auth0/nextjs-auth0` v4 (App Router compatible):

```
app/api/auth/[auth0]/route.ts   — Dynamic catch-all for Auth0 routes
                                   (/login, /logout, /callback, /me)
src/lib/auth.ts                 — Auth0 client setup, getSession helper
middleware.ts                   — Protect (app) routes, redirect unauthenticated
```

**Route handler:**
```typescript
// app/api/auth/[auth0]/route.ts
import { handleAuth } from "@auth0/nextjs-auth0";
export const GET = handleAuth();
```

**Middleware:**
```typescript
// middleware.ts
import { withMiddlewareAuthRequired } from "@auth0/nextjs-auth0/edge";
export default withMiddlewareAuthRequired();
export const config = { matcher: ["/(app)(.*)"] };
```

### 4. User Sync

On first login (Auth0 callback), upsert user to local DB:

```typescript
// src/lib/auth.ts
import { afterCallback } from "@auth0/nextjs-auth0";

// In handleAuth config:
afterCallback: async (req, session) => {
  await db.insert(user).values({
    id: session.user.sub,
    email: session.user.email,
    name: session.user.name,
    image: session.user.picture,
  }).onConflictDoUpdate({
    target: user.id,
    set: { name: session.user.name, image: session.user.picture, updatedAt: new Date() }
  });
  return session;
}
```

### 5. Session Access

- Server components: `getSession()` from `@auth0/nextjs-auth0`
- Client components: `useUser()` hook from `@auth0/nextjs-auth0/client`
- `UserProvider` wrapper in root layout for client-side access

### 6. Role-Based Access

- Admin role stored in `user.role` column
- Server-side check in layouts/actions: `if (user.role !== 'admin') redirect(...)`
- Admin can manage projects, assign annotators
- Annotators can only annotate projects they're members of

## Auth Flow

```
User clicks "Log in with Google"
  → Auth0 /authorize (Google connection)
  → Google OAuth consent
  → Auth0 callback
  → /api/auth/callback (Next.js)
  → Upsert user to DB
  → Set session cookie
  → Redirect to /projects
```

## Acceptance Criteria

- [ ] Login with Google works end-to-end
- [ ] Session persists across page reloads
- [ ] Unauthenticated users redirected to login
- [ ] User record created in DB on first login
- [ ] Logout clears session
- [ ] `getSession()` returns user in server components
- [ ] `useUser()` returns user in client components
