/**
 * Seed script — upserts project configs from src/lib/projects.ts into Supabase.
 *
 * Usage:
 *   pnpm db:seed
 *   tsx scripts/seed.ts
 *
 * Requires DATABASE_URL in .env.local
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";

const { project } = schema;

// ── DB connection ────────────────────────────────────────────────────

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Check .env.local.");
    process.exit(1);
  }
  return drizzle(postgres(url), { schema });
}

// ── Project configs (inlined to avoid "server-only" import) ──────────

interface LabelGroupConfig {
  title: string | null;
  single_choice: boolean;
  labels: string[];
}

interface ProjectConfig {
  hf_dataset: string;
  hf_config: string;
  hf_split: string;
  item_count?: number;
  chat_options: {
    annotate_roles: string[];
  };
  label_groups: Record<string, LabelGroupConfig>;
}

interface ProjectSeed {
  slug: string;
  name: string;
  description: string;
  instructions?: string;
  taskType: string;
  config: ProjectConfig;
}

const PROJECTS: ProjectSeed[] = [
  {
    slug: "wildchat-quality",
    name: "WildChat Quality Annotation",
    description:
      "Annotate chat conversations from WildChat for quality and safety.",
    instructions:
      "Read each conversation and label the **assistant** messages for quality and safety.\n\n- **Quality**: Is the response good or bad?\n- **Safety**: Is the response safe, unsafe, or borderline?",
    taskType: "chat",
    config: {
      hf_dataset: "allenai/WildChat-1M",
      hf_config: "default",
      hf_split: "train",
      chat_options: {
        annotate_roles: ["assistant"],
      },
      label_groups: {
        quality: {
          title: "Quality",
          single_choice: true,
          labels: ["good", "bad"],
        },
        safety: {
          title: "Safety",
          single_choice: false,
          labels: ["safe", "unsafe", "borderline"],
        },
      },
    },
  },
  {
    slug: "copyright-substitution-risk",
    name: "Copyright Substitution Risk",
    description:
      "Annotation task evaluating prompts for specificity (reference to specific works or styles) and expression similarity (imitation or summarization of existing content).",
    taskType: "chat",
    config: {
      hf_dataset: "viktoroo/colabel-copyright-substitution-risk",
      hf_config: "default",
      hf_split: "train",
      item_count: 5000,
      chat_options: {
        annotate_roles: ["user"],
      },
      label_groups: {
        specificity: {
          title: "Specificity",
          single_choice: true,
          labels: ["specific", "general"],
        },
        expression_similarity: {
          title: "Expression Similarity",
          single_choice: true,
          labels: ["close", "novel"],
        },
      },
    },
  },
  {
    slug: "ai-task-classification",
    name: "AI Task Mode Annotation",
    description:
      "Annotation task for classifying user prompts by the intended mode of AI-assisted writing: human-primary (user remains in control) or AI-primary (AI drafts from scratch).",
    taskType: "chat",
    config: {
      hf_dataset: "viktoroo/colabel-ai-task-classification",
      hf_config: "default",
      hf_split: "train",
      item_count: 5000,
      chat_options: {
        annotate_roles: ["user"],
      },
      label_groups: {
        task_mode: {
          title: "Task Mode",
          single_choice: true,
          labels: ["human-primary", "AI-primary"],
        },
      },
    },
  },
];

// ── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const db = createDb();

  console.log("Seeding projects...");

  for (const p of PROJECTS) {
    console.log(`  Upserting project: ${p.slug}`);

    await db
      .insert(project)
      .values({
        slug: p.slug,
        name: p.name,
        description: p.description,
        taskType: p.taskType,
        instructions: p.instructions,
        config: p.config,
      })
      .onConflictDoUpdate({
        target: project.slug,
        set: {
          name: p.name,
          description: p.description,
          taskType: p.taskType,
          instructions: p.instructions,
          config: p.config,
        },
      });
  }

  console.log(`Done. Seeded ${PROJECTS.length} project(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
