# Stage 4 — Data Layer (HF Client, Redis Cache, Server Actions)

## Goal

Implement a three-tier data access layer:
1. **HuggingFace** — source of truth for dataset items
2. **Redis** — hot cache for items, sessions, and rate limiting
3. **Supabase** — annotation diffs and user/project metadata

## Architecture

```
src/
  lib/
    hf/
      client.ts        — HF datasets API client
      types.ts         — HF row types, WildChat schema
    redis.ts           — Upstash Redis client singleton
    cache.ts           — Item caching logic (Redis-backed)
    queries/
      projects.ts      — getProjects, getProject
      annotations.ts   — getAnnotation, getUserProgress, getAnnotationStats
      members.ts       — getProjectMembers, isProjectMember
    actions/
      annotations.ts   — saveAnnotation
      members.ts       — addMember, removeMember
    schemas/
      annotation.ts    — Zod schemas for labels
      project.ts       — Zod schema for project config
```

## HuggingFace Datasets API Client

The HF datasets server provides row-level access to any public dataset via REST:

```typescript
// src/lib/hf/client.ts
const HF_DATASETS_API = "https://datasets-server.huggingface.co";

interface HfRowsResponse {
  features: Array<{ name: string; type: string }>;
  rows: Array<{ row_idx: number; row: Record<string, unknown> }>;
  num_rows_total: number;
}

export async function fetchItems(
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

  const res = await fetch(url, {
    headers: process.env.HF_TOKEN
      ? { Authorization: `Bearer ${process.env.HF_TOKEN}` }
      : {},
  });
  if (!res.ok) throw new Error(`HF API error: ${res.status}`);
  return res.json();
}

// Fetch a single item
export async function fetchItem(
  dataset: string, config: string, split: string, index: number
) {
  const data = await fetchItems(dataset, config, split, index, 1);
  return data.rows[0]?.row ?? null;
}

// Fetch total row count (cached)
export async function fetchItemCount(
  dataset: string, config: string, split: string
): Promise<number> {
  const data = await fetchItems(dataset, config, split, 0, 1);
  return data.num_rows_total;
}
```

For private datasets, set `HF_TOKEN` env var.

## Redis Cache Layer

### Setup

```typescript
// src/lib/redis.ts
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

### Where Redis Is Used

| Use Case | Key Pattern | TTL | Why |
|----------|-------------|-----|-----|
| **Item cache** | `item:{dataset}:{split}:{index}` | 24h | Avoid repeated HF API calls |
| **Item window** | `items:{dataset}:{split}:{offset}:{length}` | 24h | Batch prefetch cache |
| **Item count** | `count:{dataset}:{split}` | 1h | Avoid counting on every page load |
| **User session cache** | `session:{token}` | 15min | Avoid DB lookup on every request |
| **Annotation progress** | `progress:{project_id}:{user_id}` | 5min | Cache annotated count |
| **Rate limiting** | `ratelimit:{ip}:{endpoint}` | sliding window | Protect API routes |

### Item Caching Logic

```typescript
// src/lib/cache.ts
import { redis } from "./redis";
import { fetchItems, fetchItem } from "./hf/client";

const ITEM_TTL = 60 * 60 * 24; // 24 hours

export async function getCachedItem(
  dataset: string, config: string, split: string, index: number
): Promise<Record<string, unknown>> {
  const key = `item:${dataset}:${split}:${index}`;

  // Try cache first
  const cached = await redis.get<Record<string, unknown>>(key);
  if (cached) return cached;

  // Fetch from HF and cache
  const item = await fetchItem(dataset, config, split, index);
  if (item) await redis.set(key, item, { ex: ITEM_TTL });
  return item;
}

// Prefetch a window of items (for smooth navigation)
export async function prefetchItemWindow(
  dataset: string, config: string, split: string,
  offset: number, length: number
): Promise<void> {
  const data = await fetchItems(dataset, config, split, offset, length);
  const pipeline = redis.pipeline();
  for (const { row_idx, row } of data.rows) {
    pipeline.set(`item:${dataset}:${split}:${row_idx}`, row, { ex: ITEM_TTL });
  }
  await pipeline.exec();
}

export async function getCachedItemCount(
  dataset: string, config: string, split: string
): Promise<number> {
  const key = `count:${dataset}:${split}`;
  const cached = await redis.get<number>(key);
  if (cached !== null) return cached;

  const count = await fetchItemCount(dataset, config, split);
  await redis.set(key, count, { ex: 3600 });
  return count;
}
```

### Annotation Progress Cache

```typescript
// Invalidate on save, cache on read
export async function getCachedProgress(
  projectId: string, userId: string
): Promise<number> {
  const key = `progress:${projectId}:${userId}`;
  const cached = await redis.get<number>(key);
  if (cached !== null) return cached;

  const count = await getAnnotatedCount(projectId, userId); // DB query
  await redis.set(key, count, { ex: 300 });
  return count;
}

export async function invalidateProgress(projectId: string, userId: string) {
  await redis.del(`progress:${projectId}:${userId}`);
}
```

## Queries (Drizzle → Supabase)

### Projects

```typescript
async function getProjects(userId: string) {
  return db.select()
    .from(project)
    .innerJoin(projectMember, eq(projectMember.projectId, project.id))
    .where(and(eq(projectMember.userId, userId), eq(project.isActive, true)));
}

async function getProject(slug: string) {
  return db.query.project.findFirst({
    where: eq(project.slug, slug),
  });
}
```

### Annotations

```typescript
async function getAnnotation(projectId: string, userId: string, itemIndex: number) {
  return db.query.annotation.findFirst({
    where: and(
      eq(annotation.projectId, projectId),
      eq(annotation.userId, userId),
      eq(annotation.itemIndex, itemIndex),
    ),
  });
}

async function getAnnotatedCount(projectId: string, userId: string) {
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(annotation)
    .where(and(eq(annotation.projectId, projectId), eq(annotation.userId, userId)));
  return result[0].count;
}
```

## Server Actions

```typescript
"use server";

export async function saveAnnotationAction(input: {
  projectId: string;
  itemIndex: number;
  labels: JsonValue;
}) {
  const session = await requireSession();
  const parsed = saveAnnotationSchema.parse(input);

  await assertProjectMember(parsed.projectId, session.user.sub);

  await db.insert(annotation).values({
    projectId: parsed.projectId,
    userId: session.user.sub,
    itemIndex: parsed.itemIndex,
    labels: parsed.labels,
  }).onConflictDoUpdate({
    target: [annotation.projectId, annotation.userId, annotation.itemIndex],
    set: { labels: parsed.labels, updatedAt: new Date() },
  });

  await invalidateProgress(parsed.projectId, session.user.sub);
}
```

## API Route for Item Fetching

```typescript
// app/api/items/route.ts
// Client fetches items via this route (which checks auth + reads from cache)
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("project")!;
  const index = Number(searchParams.get("index"));
  const window = Number(searchParams.get("window") || "5");

  const proj = await getProject(projectSlug);
  if (!proj) return Response.json({ error: "Not found" }, { status: 404 });

  await assertProjectMember(proj.id, session.user.sub);

  const config = proj.config as ProjectConfig;
  const items = await prefetchAndGet(config, index, window);
  const annotations = await getAnnotationsForWindow(proj.id, session.user.sub, index, window);

  return Response.json({ items, annotations });
}
```

## Zod Schemas

```typescript
// src/lib/schemas/annotation.ts
const labelValueSchema = z.union([z.array(z.string()), z.null()]);
const labelsSchema = z.array(z.record(z.string(), labelValueSchema));

const saveAnnotationSchema = z.object({
  projectId: z.string().uuid(),
  itemIndex: z.number().int().min(0),
  labels: labelsSchema,
});

// src/lib/schemas/project.ts
const labelGroupSchema = z.object({
  title: z.string().nullable(),
  single_choice: z.boolean(),
  labels: z.array(z.string()),
});

const projectConfigSchema = z.object({
  hf_dataset: z.string(),
  hf_config: z.string().default("default"),
  hf_split: z.string().default("train"),
  item_count: z.number().int().positive(),
  chat_options: z.object({
    annotate_roles: z.array(z.string()),
  }),
  label_groups: z.record(z.string(), labelGroupSchema),
});
```

## Acceptance Criteria

- [ ] Items load from HF datasets API
- [ ] Redis caches items (24h TTL), verified via cache hit logs
- [ ] Annotation upsert works (create + update)
- [ ] Progress cache invalidates on save
- [ ] Rate limiting works on API routes
- [ ] All queries return correctly typed results
- [ ] Server actions validate session and authorization
