-- Enable Row-Level Security on all public tables.
--
-- The app connects to Postgres as the table owner via DATABASE_URL (Drizzle),
-- and owners bypass RLS, so server-side queries are unaffected.
-- This closes off the Supabase auto-generated REST API (PostgREST) for the
-- anon/authenticated roles, which is what Supabase's security advisor flags.

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "project" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "annotation" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "project_member" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invite" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Explicit deny-all policies for the Supabase API roles.
-- With RLS enabled and no permissive policies, access is already denied, but
-- making it explicit documents intent and survives future policy additions.

REVOKE ALL ON "user" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON "project" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON "annotation" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON "project_member" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON "invite" FROM anon, authenticated;
