/**
 * HF Export Script — exports annotations from Supabase merged with HF source items.
 *
 * Usage:
 *   pnpm hf:export --project <slug>
 *   pnpm hf:export --project <slug> --format jsonl
 *   pnpm hf:export --project <slug> --output ./export.jsonl
 *
 * When --output is specified, writes to a local file.
 * Otherwise, pushes to a HuggingFace dataset repo.
 *
 * Requires .env.local with DATABASE_URL (and HF_TOKEN for push).
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { createRepo, uploadFiles, type RepoDesignation } from "@huggingface/hub";

const { annotation, user, project: projectTable } = schema;

// ── DB connection (standalone, no Next.js) ───────────────────────────

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Check .env.local.");
    process.exit(1);
  }
  return drizzle(postgres(url), { schema });
}

// ── HF datasets API (inlined to avoid "server-only" import) ─────────

const HF_DATASETS_API = "https://datasets-server.huggingface.co";

interface HfRowsResponse {
  features: Array<{ name: string; type: string }>;
  rows: Array<{ row_idx: number; row: Record<string, unknown> }>;
  num_rows_total: number;
}

async function fetchItems(
  dataset: string,
  config: string,
  split: string,
  offset: number,
  length: number,
): Promise<HfRowsResponse> {
  const url = new URL(`${HF_DATASETS_API}/rows`);
  url.searchParams.set("dataset", dataset);
  url.searchParams.set("config", config);
  url.searchParams.set("split", split);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("length", String(length));

  const headers: Record<string, string> = {};
  if (process.env.HF_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.HF_TOKEN}`;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`HF API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<HfRowsResponse>;
}

// ── Project config types (inlined to avoid "server-only" import) ─────

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

interface ProjectInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  instructions?: string;
  config: ProjectConfig;
}

// Hardcoded projects (mirrors src/lib/projects.ts)
const DEMO_PROJECTS: Record<string, ProjectInfo> = {
  "wildchat-quality": {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "wildchat-quality",
    name: "WildChat Quality Annotation",
    description:
      "Annotate chat conversations from WildChat for quality and safety.",
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
  "copyright-substitution-risk": {
    id: "00000000-0000-0000-0000-000000000002",
    slug: "copyright-substitution-risk",
    name: "Copyright Substitution Risk",
    description:
      "Annotation task evaluating prompts for specificity and expression similarity.",
    config: {
      hf_dataset: "viktor-shcherb/colabel-copyright-substitution-risk",
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
  "ai-task-classification": {
    id: "00000000-0000-0000-0000-000000000003",
    slug: "ai-task-classification",
    name: "AI Task Mode Annotation",
    description:
      "Annotation task for classifying user prompts by AI-assisted writing mode.",
    config: {
      hf_dataset: "viktor-shcherb/colabel-ai-task-classification",
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
};

// ── CLI arg parsing ──────────────────────────────────────────────────

interface CliArgs {
  project: string;
  format: "jsonl" | "parquet";
  output: string | null;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let project = "";
  let format: "jsonl" | "parquet" = "jsonl";
  let output: string | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--project":
        project = args[++i] ?? "";
        break;
      case "--format":
        format = (args[++i] ?? "jsonl") as "jsonl" | "parquet";
        break;
      case "--output":
        output = args[++i] ?? null;
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!project) {
    console.error(
      "Usage: pnpm hf:export --project <slug> [--format jsonl|parquet] [--output <path>]",
    );
    process.exit(1);
  }

  if (format !== "jsonl") {
    console.error("Only JSONL format is currently supported.");
    process.exit(1);
  }

  return { project, format, output };
}

// ── Load project config ──────────────────────────────────────────────

async function loadProject(
  db: ReturnType<typeof createDb>,
  slug: string,
): Promise<ProjectInfo> {
  // Try DB first
  const row = await db.query.project.findFirst({
    where: eq(projectTable.slug, slug),
  });

  if (row) {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? "",
      instructions: row.instructions ?? undefined,
      config: row.config as ProjectConfig,
    };
  }

  // Fallback: hardcoded demo projects
  const demo = DEMO_PROJECTS[slug];
  if (!demo) {
    console.error(`Project not found: ${slug}`);
    process.exit(1);
  }
  return demo;
}

// ── Fetch all annotations with user emails ───────────────────────────

interface AnnotationRow {
  itemIndex: number;
  userEmail: string;
  labels: unknown;
  createdAt: Date;
  updatedAt: Date;
}

async function fetchAllAnnotations(
  db: ReturnType<typeof createDb>,
  projectId: string,
): Promise<AnnotationRow[]> {
  const rows = await db
    .select({
      itemIndex: annotation.itemIndex,
      userEmail: user.email,
      labels: annotation.labels,
      createdAt: annotation.createdAt,
      updatedAt: annotation.updatedAt,
    })
    .from(annotation)
    .innerJoin(user, eq(annotation.userId, user.id))
    .where(eq(annotation.projectId, projectId));

  return rows;
}

// ── Group annotations by item index ──────────────────────────────────

interface GroupedAnnotations {
  [itemIndex: number]: {
    [email: string]: {
      labels: unknown;
      annotated_at: string;
    };
  };
}

function groupAnnotations(rows: AnnotationRow[]): GroupedAnnotations {
  const grouped: GroupedAnnotations = {};
  for (const row of rows) {
    if (!grouped[row.itemIndex]) {
      grouped[row.itemIndex] = {};
    }
    grouped[row.itemIndex][row.userEmail] = {
      labels: row.labels,
      annotated_at: (row.updatedAt ?? row.createdAt).toISOString(),
    };
  }
  return grouped;
}

// ── Fetch source items from HF in batches ────────────────────────────

const HF_BATCH_SIZE = 100;

async function fetchSourceItems(
  config: ProjectConfig,
  itemIndices: number[],
): Promise<Map<number, Record<string, unknown>>> {
  const items = new Map<number, Record<string, unknown>>();
  if (itemIndices.length === 0) return items;

  // Sort indices to enable contiguous range fetching
  const sorted = [...itemIndices].sort((a, b) => a - b);

  // Build ranges: group indices that are close together to reduce API calls
  const ranges: Array<{ offset: number; length: number }> = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    // If next index is within batch size, extend current range
    if (sorted[i] - rangeEnd <= HF_BATCH_SIZE) {
      rangeEnd = sorted[i];
    } else {
      ranges.push({ offset: rangeStart, length: rangeEnd - rangeStart + 1 });
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }
  ranges.push({ offset: rangeStart, length: rangeEnd - rangeStart + 1 });

  // Fetch each range in batches of HF_BATCH_SIZE
  const neededIndices = new Set(sorted);
  for (const range of ranges) {
    for (
      let offset = range.offset;
      offset < range.offset + range.length;
      offset += HF_BATCH_SIZE
    ) {
      const batchLength = Math.min(
        HF_BATCH_SIZE,
        range.offset + range.length - offset,
      );
      console.log(
        `  Fetching HF items ${offset}..${offset + batchLength - 1}`,
      );
      try {
        const response = await fetchItems(
          config.hf_dataset,
          config.hf_config,
          config.hf_split,
          offset,
          batchLength,
        );
        for (const { row_idx, row } of response.rows) {
          if (neededIndices.has(row_idx)) {
            items.set(row_idx, row);
          }
        }
      } catch (err) {
        console.error(
          `  Warning: failed to fetch HF items at offset ${offset}:`,
          err,
        );
      }
    }
  }

  return items;
}

// ── Build JSONL output ───────────────────────────────────────────────

interface OutputRow {
  item_index: number;
  annotations: Record<string, { labels: unknown; annotated_at: string }>;
  [key: string]: unknown;
}

function buildOutputRows(
  grouped: GroupedAnnotations,
  sourceItems: Map<number, Record<string, unknown>>,
): OutputRow[] {
  const rows: OutputRow[] = [];

  const sortedIndices = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  for (const itemIndex of sortedIndices) {
    const sourceItem = sourceItems.get(itemIndex) ?? {};
    const row: OutputRow = {
      item_index: itemIndex,
      ...sourceItem,
      annotations: grouped[itemIndex],
    };
    rows.push(row);
  }

  return rows;
}

// ── Write JSONL file ─────────────────────────────────────────────────

function writeJsonl(rows: OutputRow[], filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const lines = rows.map((row) => JSON.stringify(row));
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
}

// ── Push to HuggingFace ──────────────────────────────────────────────

async function pushToHuggingFace(
  projectSlug: string,
  jsonlContent: string,
  itemCount: number,
): Promise<void> {
  const token = process.env.HF_TOKEN;
  if (!token) {
    console.error("HF_TOKEN env var is required for pushing to HuggingFace.");
    console.error("Set it in .env.local or export it before running.");
    process.exit(1);
  }

  const repoName = `colabel-${projectSlug}-annotations`;
  const credentials = { accessToken: token };
  const repo: RepoDesignation = { type: "dataset", name: repoName };

  console.log(`Creating/ensuring HF dataset repo: ${repoName}`);
  try {
    await createRepo({ repo, credentials });
    console.log(`  Created new repo: ${repoName}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("409") ||
      message.includes("already exists") ||
      message.includes("Conflict")
    ) {
      console.log(`  Repo already exists: ${repoName}`);
    } else {
      throw err;
    }
  }

  const timestamp = new Date().toISOString();
  const commitTitle = `Export annotations (${itemCount} items, ${timestamp})`;

  console.log(`Uploading annotations.jsonl to ${repoName}...`);
  await uploadFiles({
    repo,
    credentials,
    files: [
      {
        path: "data/annotations.jsonl",
        content: new Blob([jsonlContent]),
      },
    ],
    commitTitle,
  });

  console.log(`Successfully pushed to HuggingFace: ${repoName}`);
}

// ── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();
  const db = createDb();

  console.log(`Exporting annotations for project: ${args.project}`);

  // 1. Load project config
  const proj = await loadProject(db, args.project);
  console.log(`  Project: ${proj.name} (${proj.slug})`);
  console.log(`  HF dataset: ${proj.config.hf_dataset}`);

  // 2. Fetch all annotations from DB
  console.log("Fetching annotations from database...");
  const annotationRows = await fetchAllAnnotations(db, proj.id);

  if (annotationRows.length === 0) {
    console.log("No annotations found for this project. Nothing to export.");
    process.exit(0);
  }

  console.log(`  Found ${annotationRows.length} annotation(s)`);

  // 3. Group annotations by item index
  const grouped = groupAnnotations(annotationRows);
  const itemIndices = Object.keys(grouped).map(Number);
  console.log(`  Covering ${itemIndices.length} unique item(s)`);

  // 4. Fetch source items from HF (batched)
  console.log("Fetching source items from HuggingFace...");
  const sourceItems = await fetchSourceItems(proj.config, itemIndices);
  console.log(`  Fetched ${sourceItems.size} source item(s)`);

  // 5. Build merged output rows
  const outputRows = buildOutputRows(grouped, sourceItems);

  // 6. Write locally or push to HF
  if (args.output) {
    const outputPath = path.resolve(args.output);
    console.log(`Writing JSONL to ${outputPath}...`);
    writeJsonl(outputRows, outputPath);
    console.log(`Done. Wrote ${outputRows.length} row(s) to ${outputPath}`);
  } else {
    // Write to temp file, push to HF, then clean up
    const tmpDir = path.join(process.cwd(), ".export-tmp");
    const tmpFile = path.join(tmpDir, "annotations.jsonl");
    writeJsonl(outputRows, tmpFile);

    const jsonlContent = fs.readFileSync(tmpFile, "utf-8");
    await pushToHuggingFace(args.project, jsonlContent, outputRows.length);

    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log("Done.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
