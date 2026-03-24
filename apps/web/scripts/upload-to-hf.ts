/**
 * Upload source JSONL files to HuggingFace as a dataset.
 *
 * Usage:
 *   tsx scripts/upload-to-hf.ts --project copyright-substitution-risk \
 *     --data-dir ../../.ref/llm-copyright/data/copyright-substitution-risk/v1
 *
 * Requires HF_TOKEN in .env.local
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { createRepo, uploadFiles, type RepoDesignation } from "@huggingface/hub";

// ── CLI args ─────────────────────────────────────────────────────────

interface CliArgs {
  project: string;
  dataDir: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let project = "";
  let dataDir = "";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--project":
        project = args[++i] ?? "";
        break;
      case "--data-dir":
        dataDir = args[++i] ?? "";
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!project || !dataDir) {
    console.error(
      "Usage: tsx scripts/upload-to-hf.ts --project <slug> --data-dir <path>",
    );
    process.exit(1);
  }

  return { project, dataDir: path.resolve(dataDir) };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { project, dataDir } = parseArgs();

  const token = process.env.HF_TOKEN;
  if (!token) {
    console.error("HF_TOKEN env var is required. Set it in .env.local.");
    process.exit(1);
  }

  const sourceDir = path.join(dataDir, "source");
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  // Read and sort batch files
  const batchFiles = fs
    .readdirSync(sourceDir)
    .filter((f) => f.endsWith(".jsonl"))
    .sort();

  console.log(`Found ${batchFiles.length} batch file(s) in ${sourceDir}`);

  // Concatenate all batch files into a single train.jsonl
  const lines: string[] = [];
  for (const file of batchFiles) {
    const content = fs.readFileSync(path.join(sourceDir, file), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
        continue;
      }
      lines.push(trimmed);
    }
  }

  console.log(`Total items: ${lines.length}`);

  const jsonlContent = lines.join("\n") + "\n";

  // Create/ensure HF dataset repo
  const repoName = `viktoroo/colabel-${project}`;
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

  // Upload train.jsonl
  console.log(`Uploading train.jsonl (${lines.length} items) to ${repoName}...`);
  await uploadFiles({
    repo,
    credentials,
    files: [
      {
        path: "data/train.jsonl",
        content: new Blob([jsonlContent]),
      },
    ],
    commitTitle: `Upload source data (${lines.length} items)`,
  });

  console.log(`Done. Uploaded ${lines.length} items to ${repoName}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
