# Stage 10 — HuggingFace Export

## Goal

Export annotations from Supabase back to HuggingFace as a published dataset.
This closes the loop: HF → annotate → HF.

## Export Flow

```
Supabase (annotations)  +  HF (source items)
         │                        │
         └────────┬───────────────┘
                  │ merge
           ┌──────▼──────┐
           │  Export Job  │   pnpm hf:export --project wildchat-quality
           └──────┬──────┘
                  │ push
           ┌──────▼──────┐
           │  HF Output  │   viktor-shcherb/colabel-wildchat-quality-annotations
           │  Dataset     │
           └─────────────┘
```

## CLI Script: `pnpm hf:export`

```bash
pnpm hf:export --project <slug>           # Export all annotations for a project
pnpm hf:export --project <slug> --user X  # Export only user X's annotations
pnpm hf:export --project <slug> --format parquet  # Default: parquet. Also: jsonl, csv
```

### Implementation

```typescript
// scripts/hf-export.ts
// 1. Load project config from DB
// 2. Fetch all annotations for the project from Supabase
// 3. For each annotation, fetch the source item from HF (or cache)
// 4. Merge: source item + annotation labels → output row
// 5. Write to Parquet/JSONL file
// 6. Push to HF dataset repo via huggingface.js or CLI
```

### Output Schema

The exported dataset extends the source dataset with annotation columns:

```json
{
  "conversation": [...],       // original from source
  "language": "en",            // original metadata
  "model": "gpt-4",           // original metadata
  "annotations": {             // added by export
    "user_a@example.com": {
      "labels": [{"quality": ["good"]}, ...],
      "annotated_at": "2026-03-23T10:00:00Z"
    },
    "user_b@example.com": {
      "labels": [{"quality": ["poor"]}, ...],
      "annotated_at": "2026-03-23T11:00:00Z"
    }
  }
}
```

Or a flat format (one row per annotation, for easier analysis):

```json
{
  "item_index": 42,
  "annotator": "user_a@example.com",
  "labels": [{"quality": ["good"]}, ...],
  "annotated_at": "2026-03-23T10:00:00Z"
}
```

## HuggingFace Push

Use `@huggingface/hub` package:

```typescript
import { createRepo, uploadFiles } from "@huggingface/hub";

// Create output repo if needed
await createRepo({
  repo: "viktor-shcherb/colabel-wildchat-quality-annotations",
  credentials: { accessToken: process.env.HF_TOKEN! },
});

// Upload Parquet file
await uploadFiles({
  repo: "viktor-shcherb/colabel-wildchat-quality-annotations",
  credentials: { accessToken: process.env.HF_TOKEN! },
  files: [{ path: "data/annotations.parquet", content: parquetBuffer }],
  commitTitle: `Export annotations (${count} items, ${new Date().toISOString()})`,
});
```

## Scheduling

Options for automated export:
1. **Manual** — Admin runs `pnpm hf:export` when ready
2. **GitHub Action** — Cron job (e.g., nightly) that runs export
3. **Vercel Cron** — If deployed on Vercel, use cron API route
4. **run.ai job** — If a backend worker exists, schedule there

For a research team, manual export is likely sufficient initially.

## Backward Compatibility

The export can also produce JSONL in the original text-labelling format:
```
annotation/<email>/source/train.jsonl
```
This allows the team to compare results with the old system.

## Acceptance Criteria

- [ ] `pnpm hf:export` produces correct Parquet output
- [ ] Annotations are correctly merged with source items
- [ ] Multi-annotator data is properly structured
- [ ] HF push creates/updates the output dataset repo
- [ ] Export is idempotent (running twice produces same result)
- [ ] Export handles missing annotations gracefully (skip unannotated items)
