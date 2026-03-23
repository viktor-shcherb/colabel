# Stage 6 — Annotation Interface

## Goal

Build the core annotation UI — the main workflow where users label items.
This is the most critical page, replicating the Streamlit annotate page.

Items are fetched from HuggingFace (via Redis cache), annotations are
saved to Supabase as lightweight diffs.

## Page: `app/(app)/annotate/[slug]/page.tsx`

### Layout

```
┌──────────────────────────────────────────────┐
│  ← Project Name                    [3 / 150] │  Header + progress
├──────────────────────────────────────────────┤
│                                              │
│  Instructions (collapsible)                  │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─ Message ──────────────────────────────┐  │
│  │ **user**                               │  │
│  │ What is the capital of France?         │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌─ Message ──────────────────────────────┐  │
│  │ **assistant**                          │  │
│  │ The capital of France is Paris...      │  │
│  │                                        │  │
│  │ ┌─ Labels ──────────────────────────┐  │  │
│  │ │ Sentiment:  [positive] [negative] │  │  │
│  │ │ Quality:    (●high) (○low)        │  │  │
│  │ └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
├──────────────────────────────────────────────┤
│  [← Prev]    ═══════●═══════    [Next →]     │  Navigation + slider
└──────────────────────────────────────────────┘
```

### Core Behavior

1. **Load item** — Fetch from HF via Redis cache + user's annotation from Supabase
2. **Display messages** — Render each message with role header and content
3. **Label UI** — For annotatable messages (per `annotate_roles`):
   - Multi-choice: checkbox/toggle pills for each label
   - Single-choice: radio/toggle group for each label
   - Labels organized by group (with group title)
4. **Auto-save** — Save annotation on navigation (prev/next/slider change)
5. **Keyboard shortcuts** — Arrow keys for prev/next
6. **Long content** — Expandable container for messages > 300 chars

### Data Flow (Item Loading)

```
User navigates to item #42
  → Client: GET /api/items?project=wildchat-quality&index=42&window=5
  → Server:
    1. Check auth + project membership
    2. getCachedItem(dataset, split, 42)     — Redis → HF fallback
    3. prefetchItemWindow(dataset, split, 38, 10)  — warm adjacent items
    4. getAnnotation(projectId, userId, 42)  — Supabase
  → Client: receives { item, annotation }
  → Renders conversation + label UI
```

### State Management

Client-side state for the annotation page:

```typescript
const [currentIndex, setCurrentIndex] = useState(0);
const [annotation, setAnnotation] = useState<Labels>(initialLabels);
const [isDirty, setIsDirty] = useState(false);

// Navigation with auto-save
async function navigate(newIndex: number) {
  if (isDirty) {
    await saveAnnotationAction({
      projectId,
      itemIndex: currentIndex,
      labels: annotation,
    });
  }
  setCurrentIndex(newIndex);
  setIsDirty(false);
}
```

### Prefetching Strategy

When the user views item N, the `/api/items` route:
1. Returns item N (from Redis cache or HF)
2. Pre-warms Redis for items N-2 through N+7 (window of 10)
3. Returns existing annotations for items in the window

This means navigating forward/backward is instant (Redis hit).

## Components

```
src/components/
  annotation/
    AnnotationPage.tsx       — Main page client component
    MessageCard.tsx           — Single message display (role + content)
    LabelGroup.tsx            — Label group with title + pills/radios
    LabelPill.tsx             — Individual label toggle (multi-choice)
    LabelRadio.tsx            — Individual label radio (single-choice)
    NavigationBar.tsx          — Prev/Next buttons + slider + counter
    InstructionsPanel.tsx      — Collapsible instructions display
    ExpandableContent.tsx      — Content with show more/less
```

## Keyboard Shortcuts

| Key         | Action          |
| ----------- | --------------- |
| ArrowLeft   | Previous item   |
| ArrowRight  | Next item       |
| 1-9         | Quick-select label (future) |

Implemented via `useEffect` with `keydown` listener.

## Annotation Data Structure

Same as original — array of per-message label dicts:

```json
[
  {"sentiment": ["positive"], "toxicity": null},
  {"sentiment": null, "toxicity": ["low", "medium"]}
]
```

- `null` = group not yet annotated
- `[]` = group viewed but no labels selected
- `["label1", "label2"]` = selected labels

## Acceptance Criteria

- [ ] Items load from HF via Redis cache (verify cache hits in logs)
- [ ] Chat messages render with proper role styling
- [ ] Label pills toggle correctly (multi-choice)
- [ ] Radio labels work correctly (single-choice)
- [ ] Auto-save on navigation writes to Supabase (not HF)
- [ ] Keyboard navigation works
- [ ] Progress counter updates
- [ ] Slider jumps to specific item
- [ ] Long messages are expandable
- [ ] Annotation persists across page reloads
- [ ] Prefetching makes navigation feel instant
