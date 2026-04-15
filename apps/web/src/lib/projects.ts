import "server-only";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Shared project configuration types and demo data.
 * Will be replaced by DB-driven config once project management is built.
 */

function loadInstructions(slug: string): string {
  try {
    return readFileSync(
      join(process.cwd(), "src/content/instructions", `${slug}.md`),
      "utf-8",
    );
  } catch {
    return "";
  }
}

export interface LabelGroupConfig {
  title: string | null;
  single_choice: boolean;
  labels: string[];
  /**
   * Optional role-scoping. If set, this label group is only rendered on
   * conversation turns whose role is in this list. If absent, the group
   * applies to every role in `chat_options.annotate_roles`. This lets a
   * single project ask different questions of user vs assistant turns
   * without splitting into multiple projects.
   */
  roles?: string[];
}

export interface ProjectConfig {
  hf_dataset: string;
  hf_config: string;
  hf_split: string;
  item_count?: number;
  chat_options: {
    annotate_roles: string[];
  };
  label_groups: Record<string, LabelGroupConfig>;
}

export interface ProjectInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  instructions?: string;
  config: ProjectConfig;
}

// Hardcoded project configs — will be replaced by DB lookup
const DEMO_PROJECTS: Record<string, ProjectInfo> = {
  "copyright-substitution-risk": {
    id: "00000000-0000-0000-0000-000000000002",
    slug: "copyright-substitution-risk",
    name: "Copyright Substitution Risk",
    description:
      "Annotation task evaluating both prompts (attempted substitution risk) and assistant outputs (realized substitution risk) along the same 2x2 axes: specificity (reference to specific works or styles) and expression similarity (imitation, summarization, or reproduction of existing content).",
    instructions: loadInstructions("copyright-substitution-risk"),
    config: {
      hf_dataset: "viktoroo/colabel-copyright-substitution-risk",
      hf_config: "default",
      hf_split: "train",
      item_count: 5000,
      chat_options: {
        annotate_roles: ["user", "assistant"],
      },
      label_groups: {
        specificity: {
          title: "Specificity (prompt)",
          single_choice: true,
          labels: ["specific", "general"],
          roles: ["user"],
        },
        expression_similarity: {
          title: "Expression Similarity (prompt)",
          single_choice: true,
          labels: ["close", "novel"],
          roles: ["user"],
        },
        output_specificity: {
          title: "Specificity (output)",
          single_choice: true,
          labels: ["specific", "general"],
          roles: ["assistant"],
        },
        output_expression_similarity: {
          title: "Expression Similarity (output)",
          single_choice: true,
          labels: ["close", "novel"],
          roles: ["assistant"],
        },
      },
    },
  },

  "ai-task-classification": {
    id: "00000000-0000-0000-0000-000000000003",
    slug: "ai-task-classification",
    name: "AI Task Mode Annotation",
    description:
      "Annotation task for classifying user prompts by the intended mode of AI-assisted writing: human-primary (user remains in control) or AI-primary (AI drafts from scratch).",
    instructions: loadInstructions("ai-task-classification"),
    config: {
      hf_dataset: "viktoroo/colabel-ai-task-classification",
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

export function getProjectBySlug(slug: string): ProjectInfo | null {
  return DEMO_PROJECTS[slug] ?? null;
}

export function getAllProjects(): ProjectInfo[] {
  return Object.values(DEMO_PROJECTS);
}
