/**
 * Migrate annotations from old text-labelling format (Git/JSONL) to Supabase.
 *
 * Usage:
 *   tsx scripts/migrate-annotations.ts --data-dir ../../.ref/llm-copyright/data
 *
 * Requires DATABASE_URL in .env.local
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const { annotation, user, project: projectTable } = schema;

// ── DB connection ────────────────────────────────────────────────────

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Check .env.local.");
    process.exit(1);
  }
  return drizzle(postgres(url), { schema });
}

// ── Email mapping ────────────────────────────────────────────────────

const SAFE_EMAIL_MAP: Record<string, string> = {
  "viktoroo.sch_gmail.com": "viktoroo.sch@gmail.com",
  "christian.peukert_unil.ch": "christian.peukert@unil.ch",
  "legal1": "legal1@colabel.local",
  // LLM annotators — v1 prompt (user-side only)
  "gpt-5__v1": "gpt-5__v1@llm.colabel.local",
  "gpt-4.1__v1": "gpt-4.1__v1@llm.colabel.local",
  "gpt-4.1-mini__v1": "gpt-4.1-mini__v1@llm.colabel.local",
  // LLM annotators — v2 prompt (whole-conversation, user + assistant in one call)
  "gpt-5__v2": "gpt-5__v2@llm.colabel.local",
  "gpt-4.1__v2": "gpt-4.1__v2@llm.colabel.local",
  // LLM annotators — v3 prompt (decoupled per-turn; WildChat-sampled slice shape)
  "gpt-5__v3": "gpt-5__v3@llm.colabel.local",
  "gpt-5-mini__v3": "gpt-5-mini__v3@llm.colabel.local",
  "gpt-5.4__v3": "gpt-5.4__v3@llm.colabel.local",
  "gpt-5.4-mini__v3": "gpt-5.4-mini__v3@llm.colabel.local",
  "gpt-4.1__v3": "gpt-4.1__v3@llm.colabel.local",
  "gpt-4.1-mini__v3": "gpt-4.1-mini__v3@llm.colabel.local",
};

// ── Projects to migrate ──────────────────────────────────────────────

const PROJECTS_TO_MIGRATE = [
  "copyright-substitution-risk",
  "ai-task-classification",
];

// ── CLI args ─────────────────────────────────────────────────────────

function parseArgs(): { dataDir: string } {
  const args = process.argv.slice(2);
  let dataDir = "";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--data-dir":
        dataDir = args[++i] ?? "";
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!dataDir) {
    console.error(
      "Usage: tsx scripts/migrate-annotations.ts --data-dir <path>",
    );
    process.exit(1);
  }

  return { dataDir: path.resolve(dataDir) };
}

// ── Check if annotation has non-empty labels ─────────────────────────

function hasNonEmptyLabels(
  labels: Array<Record<string, unknown>>,
): boolean {
  return labels.some(
    (entry) => Object.keys(entry).length > 0,
  );
}

// ── Ensure user exists ───────────────────────────────────────────────

async function ensureUser(
  db: ReturnType<typeof createDb>,
  email: string,
): Promise<string> {
  // Use a placeholder Auth0-style ID for migration
  const placeholderId = `migrated|${email}`;

  await db
    .insert(user)
    .values({
      id: placeholderId,
      email,
      name: email.split("@")[0],
    })
    .onConflictDoNothing();

  // Fetch the user to get the actual ID (may already exist with different ID)
  const existing = await db.query.user.findFirst({
    where: eq(user.email, email),
  });

  if (!existing) {
    throw new Error(`Failed to ensure user: ${email}`);
  }

  return existing.id;
}

// ── Migrate one project ──────────────────────────────────────────────

async function migrateProject(
  db: ReturnType<typeof createDb>,
  dataDir: string,
  projectSlug: string,
): Promise<void> {
  console.log(`\nMigrating project: ${projectSlug}`);

  // Find project in DB
  const proj = await db.query.project.findFirst({
    where: eq(projectTable.slug, projectSlug),
  });

  if (!proj) {
    console.error(
      `  Project "${projectSlug}" not found in DB. Run db:seed first.`,
    );
    return;
  }

  const annotationDir = path.join(
    dataDir,
    projectSlug,
    "v1",
    "annotation",
  );

  if (!fs.existsSync(annotationDir)) {
    console.log(`  No annotation directory found at ${annotationDir}`);
    return;
  }

  const userDirs = fs.readdirSync(annotationDir);
  console.log(`  Found ${userDirs.length} annotator(s): ${userDirs.join(", ")}`);

  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const safeEmail of userDirs) {
    const email = SAFE_EMAIL_MAP[safeEmail];
    if (!email) {
      console.warn(`  Unknown annotator directory: ${safeEmail}, skipping`);
      continue;
    }

    console.log(`  Processing annotator: ${safeEmail} → ${email}`);

    // Ensure user exists
    const userId = await ensureUser(db, email);

    // Read annotation batch files
    const sourceDir = path.join(annotationDir, safeEmail, "source");
    if (!fs.existsSync(sourceDir)) {
      console.log(`    No source directory at ${sourceDir}`);
      continue;
    }

    const batchFiles = fs
      .readdirSync(sourceDir)
      .filter((f) => f.endsWith(".jsonl"))
      .sort();

    let annotatorMigrated = 0;
    let annotatorSkipped = 0;

    for (const batchFile of batchFiles) {
      // Compute global item index from batch file name
      // batch-0000.jsonl → starts at index 0
      // batch-0001.jsonl → starts at index 100
      const batchMatch = batchFile.match(/batch-(\d+)\.jsonl/);
      if (!batchMatch) {
        console.warn(`    Unexpected file name: ${batchFile}, skipping`);
        continue;
      }
      const batchNumber = parseInt(batchMatch[1], 10);
      const batchStartIndex = batchNumber * 100;

      const content = fs.readFileSync(
        path.join(sourceDir, batchFile),
        "utf-8",
      );
      const lines = content.split("\n");

      let lineOffset = 0;
      const batchValues: Array<{
        projectId: string;
        userId: string;
        itemIndex: number;
        labels: unknown;
      }> = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
          continue;
        }

        const parsed = JSON.parse(trimmed) as {
          labels: Array<Record<string, unknown>>;
        };

        const globalIndex = batchStartIndex + lineOffset;

        if (hasNonEmptyLabels(parsed.labels)) {
          batchValues.push({
            projectId: proj.id,
            userId,
            itemIndex: globalIndex,
            labels: parsed.labels,
          });
          annotatorMigrated++;
        } else {
          annotatorSkipped++;
        }

        lineOffset++;
      }

      // Bulk upsert the batch
      if (batchValues.length > 0) {
        for (const row of batchValues) {
          await db
            .insert(annotation)
            .values(row)
            .onConflictDoNothing();
        }
      }
    }

    console.log(
      `    Migrated: ${annotatorMigrated}, Skipped (empty): ${annotatorSkipped}`,
    );
    totalMigrated += annotatorMigrated;
    totalSkipped += annotatorSkipped;
  }

  console.log(
    `  Project total — Migrated: ${totalMigrated}, Skipped: ${totalSkipped}`,
  );
}

// ── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { dataDir } = parseArgs();
  const db = createDb();

  console.log("Starting annotation migration...");
  console.log(`Data directory: ${dataDir}`);

  for (const slug of PROJECTS_TO_MIGRATE) {
    await migrateProject(db, dataDir, slug);
  }

  console.log("\nMigration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
