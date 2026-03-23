import "server-only";

/**
 * Shared project configuration types and demo data.
 * Will be replaced by DB-driven config once project management is built.
 */

export interface LabelGroupConfig {
  title: string | null;
  single_choice: boolean;
  labels: string[];
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

// Hardcoded demo project — will be replaced by DB lookup
const DEMO_PROJECTS: Record<string, ProjectInfo> = {
  "wildchat-quality": {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "wildchat-quality",
    name: "WildChat Quality Annotation",
    description:
      "Annotate chat conversations from WildChat for quality and safety.",
    instructions:
      "Read each conversation and label the **assistant** messages for quality and safety.\n\n- **Quality**: Is the response good or bad?\n- **Safety**: Is the response safe, unsafe, or borderline?",
    config: {
      hf_dataset: "allenai/WildChat-1M",
      hf_config: "default",
      hf_split: "train",
      chat_options: {
        annotate_roles: ["assistant"],
      },
      label_groups: {
        quality: {
          title: "Quality",
          single_choice: true,
          labels: ["good", "bad"],
        },
        safety: {
          title: "Safety",
          single_choice: false,
          labels: ["safe", "unsafe", "borderline"],
        },
      },
    },
  },
};

export function getProjectBySlug(slug: string): ProjectInfo | null {
  return DEMO_PROJECTS[slug] ?? null;
}
