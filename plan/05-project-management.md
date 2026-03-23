# Stage 5 — Project Management

## Goal

Build the project selection pages and the git-based admin workflow.
Projects are configured via code, not a UI dashboard.

## Admin Workflow (Git-Based)

Project configuration lives in the repo and is seeded to the database:

```
apps/web/src/content/projects/
  wildchat-quality.ts      # Project config (exported object)
  wildchat-safety.ts
```

Each file exports a project config:

```typescript
// apps/web/src/content/projects/wildchat-quality.ts
import type { ProjectSeed } from "@/lib/schemas/project";

export const project: ProjectSeed = {
  slug: "wildchat-quality",
  name: "WildChat Quality Assessment",
  description: "Rate the quality of assistant responses in WildChat conversations",
  taskType: "chat",
  instructions: `
## Instructions
Rate each assistant response for quality...
  `,
  config: {
    hf_dataset: "viktor-shcherb/colabel-wildchat-subset",
    hf_config: "default",
    hf_split: "train",
    item_count: 500,
    chat_options: { annotate_roles: ["assistant"] },
    label_groups: {
      quality: { title: "Response Quality", single_choice: true, labels: ["good", "acceptable", "poor"] },
      helpfulness: { title: "Helpfulness", single_choice: true, labels: ["helpful", "neutral", "unhelpful"] },
    },
  },
};
```

### Seeding

```bash
pnpm db:seed              # Upserts projects + members from content/ files
```

The seed script reads all project files from `src/content/projects/`,
upserts them to the `project` table, and optionally seeds `project_member`
rows from a members list.

### Dataset Preparation

Before creating a project, the admin prepares the HF dataset:

1. Filter/sample from WildChat (or other source)
2. Upload as a new HF dataset repo (e.g., `viktor-shcherb/colabel-wildchat-subset`)
3. Note the row count
4. Create the project config file pointing to it

## Pages

### 5.1 Project List — `app/(app)/projects/page.tsx`

- Shows all projects the user is a member of
- Each project card displays:
  - Name, description
  - Item count (from `config.item_count`)
  - User's annotation progress (from Redis-cached count)
  - "Annotate" button → `/annotate/[slug]`
- Progress is shown as `N / total` with a progress bar

### 5.2 Project Detail — `app/(app)/projects/[slug]/page.tsx`

- Project metadata (name, description)
- Instructions (rendered markdown)
- Annotation progress for current user
- Team progress overview (all members, admin view)
- "Start Annotating" CTA
- Link to HF dataset (for transparency)

## Components

```
src/components/
  projects/
    ProjectCard.tsx          — Card in project list (name, progress, CTA)
    ProjectDetail.tsx        — Full project view with instructions
    ProgressBar.tsx          — Annotation progress indicator
    MemberList.tsx           — Team progress table (admin view)
```

## Data Flow

```
Project List Page
  → Server: getProjects(userId) — projects user is a member of
  → Server: getCachedProgress(projectId, userId) — per-project progress (Redis)
  → Client: renders ProjectCard for each

Project Detail Page
  → Server: getProject(slug) — project config
  → Server: getCachedItemCount() — total items (Redis, from HF)
  → Server: getCachedProgress() — user progress (Redis)
  → Client: renders instructions + progress
```

## Acceptance Criteria

- [ ] Users see only projects they're members of
- [ ] Project cards show accurate progress counts
- [ ] Project detail page renders markdown instructions
- [ ] `pnpm db:seed` creates/updates projects from config files
- [ ] Progress updates reflect after annotating
