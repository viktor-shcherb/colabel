# Stage 9 — Future Enhancements

## Items for Later Stages

### 9.1 run.ai Backend Worker

If annotation tasks require server-side computation (e.g., ML pre-annotation,
dataset preprocessing, export pipelines):

- Separate `apps/worker` in the monorepo (Python or Node)
- Runs on run.ai as a containerized job
- Reads tasks from a `job_queue` table in Supabase
- Writes results back to `item.data` or a separate `enrichment` table
- Triggered by: Supabase webhook, cron, or manual trigger from UI

### 9.2 Real-Time Collaboration

- Supabase Realtime for live annotation updates
- Show which item other users are currently annotating
- Live progress updates on statistics page

### 9.3 Export & Reporting

- Export annotations as JSONL (matching original format for backward compatibility)
- Export as CSV for analysis
- Downloadable dataset with annotations merged into items

### 9.4 Additional Task Types

The `task_type` discriminator allows extending beyond chat:

- **Text classification** — Single text + labels (no conversation structure)
- **Span annotation** — Highlight text spans with labels (NER-style)
- **Pairwise comparison** — Compare two items, select preferred

Each type would need:
- A new config schema (in `project.config`)
- A new annotation renderer component
- Corresponding Zod validation

### 9.5 Pre-Annotation / AI Assist

- Use LLM to pre-fill annotations as suggestions
- Annotators review and correct rather than starting from scratch
- Track which annotations are human-verified vs AI-suggested

### 9.6 Quality Control

- Gold standard items (admin-annotated) mixed into the queue
- Agreement metrics between annotator and gold standard
- Flag low-agreement items for review

### 9.7 Notifications

- Email notifications when assigned to a new project
- Weekly progress digest
- Use Resend for transactional email (same as jobseek)

### 9.8 Admin Dashboard

- Cross-project overview
- Annotator performance metrics
- Project health indicators
- Bulk user management
