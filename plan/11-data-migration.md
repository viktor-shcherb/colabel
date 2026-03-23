# Stage 11 — Migrate Data from text-labelling

## Goal

Migrate existing projects, datasets, and annotations from the old
text-labelling system (Git/JSONL) to the new architecture (HF + Supabase).

## What Needs Migrating

### Source: Git Repos

The old system stores everything in GitHub repos. Two projects are configured:

```yaml
# app_settings.yaml
projects:
  copyright-substitution-risk: https://github.com/cpeukert/llm-copyright/tree/main/data/copyright-substitution-risk
  ai-task-classification: https://github.com/cpeukert/llm-copyright/tree/main/data/ai-task-classification
```

Each project repo has this structure:
```
data/<project-slug>/
  <version>/                      # e.g., "v1"
    project.yaml                  # project config (name, label_groups, instructions)
    source/
      train.jsonl                 # dataset items, one JSON per line
    annotation/
      user_example_com/           # safe-email directory per annotator
        source/
          train.jsonl             # annotations, line-aligned with source items
```

### Destination

| Old Location | New Location |
|-------------|-------------|
| `source/*.jsonl` (items) | HuggingFace dataset repo |
| `project.yaml` (config) | `apps/web/src/content/projects/<slug>.ts` + Supabase `project` table |
| `annotation/<email>/source/*.jsonl` (labels) | Supabase `annotation` table |
| Auth0 users | Already in Auth0 tenant — just need `user` table sync |

## Migration Steps

### Step 1: Clone Source Repos

```bash
git clone https://github.com/cpeukert/llm-copyright.git .ref/llm-copyright
```

### Step 2: Upload Items to HuggingFace

For each project, upload the source JSONL to a new HF dataset repo.

```bash
# Install HF CLI
pip install huggingface-hub

# Login
huggingface-cli login

# Create dataset repo and upload
huggingface-cli repo create <org>/colabel-<slug> --type dataset
huggingface-cli upload <org>/colabel-<slug> \
  .ref/llm-copyright/data/<slug>/<version>/source/train.jsonl \
  data/train.jsonl
```

Alternatively, use a script that converts JSONL → Parquet for better HF integration:

```python
# scripts/upload-to-hf.py
from datasets import Dataset
import json

items = []
with open("source/train.jsonl") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("//"):
            continue
        items.append(json.loads(line))

ds = Dataset.from_list(items)
ds.push_to_hub("<org>/colabel-<slug>")
```

After upload, note the row count (`ds.num_rows`) for the project config.

### Step 3: Create Project Config Files

For each project, create a config in `apps/web/src/content/projects/`:

```typescript
// apps/web/src/content/projects/copyright-substitution-risk.ts
import type { ProjectSeed } from "@/lib/schemas/project";

export const project: ProjectSeed = {
  slug: "copyright-substitution-risk",
  name: "Copyright Substitution Risk",        // from project.yaml
  description: "...",                          // from project.yaml
  taskType: "chat",
  instructions: `...`,                        // from project.yaml
  config: {
    hf_dataset: "<org>/colabel-copyright-substitution-risk",
    hf_config: "default",
    hf_split: "train",
    item_count: 500,                           // from step 2
    chat_options: {
      annotate_roles: ["assistant"],           // from project.yaml
    },
    label_groups: {
      // Copy from project.yaml, converting YAML → TypeScript
    },
  },
};
```

### Step 4: Seed Projects to Supabase

```bash
pnpm db:seed
```

### Step 5: Migrate Annotations

Script: `scripts/migrate-annotations.ts`

This reads old annotation JSONL files and inserts them into Supabase.

```typescript
// scripts/migrate-annotations.ts
import { db } from "../src/db";
import { annotation, user, project } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const OLD_DATA_ROOT = "../../.ref/llm-copyright/data";

// Map of old safe-email directories → Auth0 user IDs
// You'll need to fill this manually or query Auth0
const EMAIL_TO_AUTH0_ID: Record<string, string> = {
  "viktoroo_sch_gmail_com": "auth0|...",
  // Add all annotators here
};

async function migrateAnnotations(
  projectSlug: string,
  version: string,
) {
  // Get project from DB
  const proj = await db.query.project.findFirst({
    where: eq(project.slug, projectSlug),
  });
  if (!proj) throw new Error(`Project ${projectSlug} not found`);

  const annotationDir = join(OLD_DATA_ROOT, projectSlug, version, "annotation");
  const userDirs = readdirSync(annotationDir);

  for (const safeEmail of userDirs) {
    const userId = EMAIL_TO_AUTH0_ID[safeEmail];
    if (!userId) {
      console.warn(`Unknown annotator: ${safeEmail}, skipping`);
      continue;
    }

    // Ensure user exists in DB
    await db.insert(user).values({
      id: userId,
      email: safeEmail.replace(/_/g, "."), // rough reverse
      name: safeEmail,
    }).onConflictDoNothing();

    // Read annotation files
    const sourceDir = join(annotationDir, safeEmail, "source");
    const files = readdirSync(sourceDir).filter(f => f.endsWith(".jsonl"));

    let globalIndex = 0; // tracks position across files (matches HF row index)

    for (const file of files.sort()) {
      const content = readFileSync(join(sourceDir, file), "utf-8");
      const lines = content.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
          continue;
        }

        const parsed = JSON.parse(trimmed);

        // Only migrate non-empty annotations
        const hasLabels = parsed.labels?.some(
          (entry: Record<string, unknown>) => Object.values(entry).some(v => v !== null)
        );

        if (hasLabels) {
          await db.insert(annotation).values({
            projectId: proj.id,
            userId,
            itemIndex: globalIndex,
            labels: parsed.labels,
          }).onConflictDoNothing();
        }

        globalIndex++;
      }
    }

    console.log(`Migrated ${globalIndex} items for ${safeEmail} → ${projectSlug}`);
  }
}

// Run for each project
await migrateAnnotations("copyright-substitution-risk", "v1");
await migrateAnnotations("ai-task-classification", "v1");
```

### Step 6: Verify Migration

```sql
-- In Drizzle Studio or psql:

-- Check annotation counts per project per user
SELECT p.slug, u.email, count(*) as annotations
FROM annotation a
JOIN project p ON a.project_id = p.id
JOIN "user" u ON a.user_id = u.id
GROUP BY p.slug, u.email;
```

Also verify by:
1. Opening the app and navigating to each project
2. Checking that previously-annotated items show their labels
3. Comparing annotation counts with the old system

## Critical: Index Alignment

The `item_index` in Supabase must match the row index in the HF dataset.
This requires that items are uploaded to HF in the **exact same order**
they appear in the source JSONL files (skipping comments/blanks).

If a project has multiple source files (`train.jsonl`, `test.jsonl`),
they must be concatenated in sorted filename order — matching the old
`load_items()` behavior which globs `source/*.jsonl` sorted.

### Verification Script

```typescript
// scripts/verify-alignment.ts
// For each migrated annotation, fetch the item from HF and verify
// that the conversation structure matches what was annotated
```

## User ID Mapping

The old system uses email addresses. The new system uses Auth0 user IDs.
You need a mapping from safe-email → Auth0 sub.

Options:
1. **Manual mapping** — for a small team, just list them
2. **Auth0 Management API** — query users by email:
   ```bash
   curl -H "Authorization: Bearer $MGMT_TOKEN" \
     "https://<tenant>.auth0.com/api/v2/users?q=email:user@example.com"
   ```
3. **First-login sync** — let users log in first (creates `user` rows),
   then run migration script which matches by email

Option 3 is simplest: have all team members log in once, then run migration.

## Acceptance Criteria

- [ ] All source items uploaded to HF with correct row indices
- [ ] Project configs created and seeded to Supabase
- [ ] All non-empty annotations migrated with correct item indices
- [ ] Annotation counts match between old and new systems
- [ ] Users can see their old annotations in the new UI
- [ ] Index alignment verified (item at index N matches annotation at index N)
