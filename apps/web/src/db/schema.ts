import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── User (synced from Auth0 on login) ────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(), // Auth0 sub (e.g., "auth0|abc123")
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  role: text("role", { enum: ["admin", "annotator"] })
    .default("annotator")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ── Project (config only — no dataset content) ──────────────────────

export const project = pgTable("project", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull().default("chat"),
  instructions: text("instructions"), // markdown
  config: jsonb("config").notNull().default({}), // hf_dataset, label_groups, chat_options
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ── Annotation (diffs only — labels keyed by item index, no item content) ──

export const annotation = pgTable(
  "annotation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemIndex: integer("item_index").notNull(), // row index in HF dataset
    labels: jsonb("labels").notNull(), // per-message labels array
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_annotation_project_user_item").on(
      table.projectId,
      table.userId,
      table.itemIndex,
    ),
    index("idx_annotation_user").on(table.userId),
    index("idx_annotation_project_item").on(table.projectId, table.itemIndex),
  ],
);

// ── Project Membership ──────────────────────────────────────────────

export const projectMember = pgTable(
  "project_member",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "annotator"] })
      .default("annotator")
      .notNull(),
    invitedAt: timestamp("invited_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_pm_project_user").on(table.projectId, table.userId),
  ],
);

// ── Invite (link-based authentication) ──────────────────────────────

export const invite = pgTable("invite", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  email: text("email"),
  name: text("name"),
  role: text("role", { enum: ["admin", "annotator"] })
    .default("annotator")
    .notNull(),
  projectId: uuid("project_id").references(() => project.id, {
    onDelete: "set null",
  }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
