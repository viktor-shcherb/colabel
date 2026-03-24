/**
 * Create an invite link for a user.
 *
 * Usage:
 *   npx tsx scripts/create-invite.ts --name "Legal Annotator 1" --email legal1@firm.com --project copyright-substitution-risk --expires 30d
 *
 * Options:
 *   --name     Display name for the user (required)
 *   --email    Email address (optional)
 *   --project  Project slug to auto-add user to (optional)
 *   --role     User role: admin | annotator (default: annotator)
 *   --expires  Expiry duration: e.g. 7d, 30d, 1h (default: 30d)
 *
 * Requires DATABASE_URL in .env.local
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import crypto from "crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const { invite, project } = schema;

// ── Parse args ────────────────────────────────────────────────────────

function parseArgs(): {
  name: string;
  email?: string;
  project?: string;
  role: "admin" | "annotator";
  expires: string;
} {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, "");
    const value = args[i + 1];
    if (key && value) {
      parsed[key] = value;
    }
  }

  if (!parsed.name) {
    console.error("Error: --name is required");
    console.error(
      'Usage: npx tsx scripts/create-invite.ts --name "User Name" [--email user@example.com] [--project slug] [--role annotator] [--expires 30d]',
    );
    process.exit(1);
  }

  const role = parsed.role ?? "annotator";
  if (role !== "admin" && role !== "annotator") {
    console.error('Error: --role must be "admin" or "annotator"');
    process.exit(1);
  }

  return {
    name: parsed.name,
    email: parsed.email,
    project: parsed.project,
    role,
    expires: parsed.expires ?? "30d",
  };
}

// ── Parse duration string ─────────────────────────────────────────────

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([dhm])$/);
  if (!match) {
    console.error(
      'Error: Invalid duration format. Use e.g. "30d", "7d", "24h", "60m"',
    );
    process.exit(1);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "m":
      return value * 60 * 1000;
    default:
      return value * 24 * 60 * 60 * 1000;
  }
}

// ── DB connection ─────────────────────────────────────────────────────

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Check .env.local.");
    process.exit(1);
  }
  return drizzle(postgres(url), { schema });
}

// ── Main ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();
  const db = createDb();

  // Resolve project slug to ID if provided
  let projectId: string | null = null;
  if (args.project) {
    const [proj] = await db
      .select({ id: project.id })
      .from(project)
      .where(eq(project.slug, args.project))
      .limit(1);

    if (!proj) {
      console.error(`Error: Project "${args.project}" not found in database.`);
      process.exit(1);
    }
    projectId = proj.id;
  }

  // Generate secure random token
  const token = crypto.randomBytes(32).toString("base64url");

  // Calculate expiry
  const durationMs = parseDuration(args.expires);
  const expiresAt = new Date(Date.now() + durationMs);

  // Insert into DB
  await db.insert(invite).values({
    token,
    email: args.email ?? null,
    name: args.name,
    role: args.role,
    projectId,
    expiresAt,
  });

  // Build invite URL
  const baseUrl =
    process.env.APP_BASE_URL ?? "https://colabel-text.vercel.app";
  const inviteUrl = `${baseUrl}/invite/${token}`;

  console.log("");
  console.log("Invite created successfully!");
  console.log("─".repeat(60));
  console.log(`  Name:      ${args.name}`);
  if (args.email) {
    console.log(`  Email:     ${args.email}`);
  }
  console.log(`  Role:      ${args.role}`);
  if (args.project) {
    console.log(`  Project:   ${args.project}`);
  }
  console.log(`  Expires:   ${expiresAt.toISOString()}`);
  console.log("");
  console.log(`  Link: ${inviteUrl}`);
  console.log("─".repeat(60));
  console.log("");

  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to create invite:", err);
  process.exit(1);
});
