# Stage 7 — Statistics & Progress

## Goal

Build a statistics page showing annotation progress per user and per project.
The original app had this as a stub — we'll implement it properly.

## Page: `app/(app)/projects/[slug]/stats/page.tsx`

### Metrics

1. **Overall progress** — Total items (from `config.item_count`) vs annotated items (bar chart)
2. **Per-user progress** — Each annotator's completion count
3. **Inter-annotator agreement** — For items annotated by multiple users,
   show agreement percentage per label group
4. **Annotation timeline** — Items annotated over time (line chart)
5. **Label distribution** — Per label group, show label frequency

### Data Queries

```typescript
// Completion stats per user (from Supabase — annotations table is small)
async function getAnnotationStats(projectId: string) {
  return db.select({
    userId: annotation.userId,
    userName: user.name,
    count: sql<number>`count(*)`,
  })
  .from(annotation)
  .innerJoin(user, eq(annotation.userId, user.id))
  .where(eq(annotation.projectId, projectId))
  .groupBy(annotation.userId, user.name);
}

// Total items — from project config (no DB query needed)
function getItemCount(project: Project): number {
  return (project.config as ProjectConfig).item_count;
}
```

### Caching Strategy

- Per-user progress counts are cached in Redis (`progress:{project_id}:{user_id}`, 5min TTL)
- Invalidated on annotation save
- Stats page aggregates these for the team view
- Label distribution queries are lightweight (annotation table is small) — no extra caching needed

### Components

```
src/components/
  stats/
    ProgressBar.tsx         — Overall completion bar
    UserProgressTable.tsx   — Per-user completion table
    LabelDistribution.tsx   — Label frequency chart
```

### Charts

Use a lightweight charting library — `recharts` or just CSS/Tailwind bars.
Avoid heavy dependencies for what are essentially progress indicators.

## Acceptance Criteria

- [ ] Overall progress percentage is correct
- [ ] Per-user annotation counts are accurate
- [ ] Page loads quickly (progress from Redis, stats from small DB table)
- [ ] Label distribution shows correct frequencies
