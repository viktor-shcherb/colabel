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

// Hardcoded project configs — will be replaced by DB lookup
const DEMO_PROJECTS: Record<string, ProjectInfo> = {
  "copyright-substitution-risk": {
    id: "00000000-0000-0000-0000-000000000002",
    slug: "copyright-substitution-risk",
    name: "Copyright Substitution Risk",
    description:
      "Annotation task evaluating prompts for specificity (reference to specific works or styles) and expression similarity (imitation or summarization of existing content).",
    instructions: `# Annotation Instructions — Copyright Substitution Risk

The goal is to categorize user messages by:

1. **Specificity:** Does the prompt point to a **specific protected work or creator/style**?
   * Options: \`specific\` or \`general\`

2. **Expression similarity:** Does the prompt ask for output that **mimics, paraphrases, summarizes, continues, or translates** existing protected expression?
   * Options: \`close\` or \`novel\`

> You will **only** choose one value in each label group.

---

## Quick start

1. **Scan for named works/creators/styles.** If the prompt names a book, song, show, article, franchise, author, publication, or says "in the style of X," mark **\`specific\`**. Otherwise **\`general\`**.
2. **Check what is being asked of the model.**
   * If it asks to **summarize, paraphrase, translate, continue, imitate a style/voice**, or otherwise produce text **close** to existing expression → **\`close\`**.
   * If it asks for **facts, lists, explanations, instructions, code, or original content** not tied to copying/imitating expression → **\`novel\`**.
3. **Edge rule:** If the prompt has **multiple parts**, pick **\`specific\`** if **any** part refers to a specific work/creator; pick **\`close\`** if **any** part asks for mimic/summary/translation/continuation.`,
    config: {
      hf_dataset: "viktoroo/colabel-copyright-substitution-risk",
      hf_config: "default",
      hf_split: "train",
      item_count: 5000,
      chat_options: {
        annotate_roles: ["user"],
      },
      label_groups: {
        specificity: {
          title: "Specificity",
          single_choice: true,
          labels: ["specific", "general"],
        },
        expression_similarity: {
          title: "Expression Similarity",
          single_choice: true,
          labels: ["close", "novel"],
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
    instructions: `# Annotation Instructions — AI Task Mode

The goal is to categorize each user message by which AI-assisted writing mode it requests:

1. **Human-Primary**: AI acts only as an editor or polisher of text the user has already written.
   * Indicators: The user provides existing text and explicitly asks for edits, polishing, grammar/style improvements.

2. **AI-Primary**: AI generates new text from scratch based on the user's prompt.
   * Indicators: The user asks the AI to "write," "generate," "draft," "compose," "create" new content.

> You **must** choose exactly one label for **Task Mode**.

---

## Quick Start

1. **Look for user-provided text to edit.**
   - If the message includes text snippets and instructions to correct or polish them → **human-primary**.
   - Otherwise, go to step 2.

2. **Check for content generation requests.**
   - Keywords: "Write an essay on…," "Generate a story about…," "Draft a summary of…," "Compose a poem."
   - If AI is asked to produce new content → **AI-primary**.

3. **Edge rule:**
   - If the prompt contains multiple parts and **any** part requires full generative drafting → **AI-primary**.
   - Only if **all** parts strictly ask for editing or polishing existing text → **human-primary**.`,
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
