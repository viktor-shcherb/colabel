import { fetchItemCount } from "@/lib/hf/client";

// Hardcoded demo project config — will be replaced by DB-driven config in stage 05
const DEMO_PROJECT = {
  slug: "wildchat-quality",
  name: "WildChat Quality Annotation",
  description:
    "Annotate chat conversations from WildChat for quality and safety.",
  hf_dataset: "allenai/WildChat-1M",
  hf_config: "default",
  hf_split: "train",
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
};

export default async function ProjectsPage() {
  let itemCount: number | null = null;
  let error: string | null = null;

  try {
    itemCount = await fetchItemCount(
      DEMO_PROJECT.hf_dataset,
      DEMO_PROJECT.hf_config,
      DEMO_PROJECT.hf_split,
    );
  } catch (e) {
    error =
      e instanceof Error ? e.message : "Failed to fetch item count from HF";
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-medium">Projects</h2>

      <div className="rounded-lg border border-gray-200 p-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold">{DEMO_PROJECT.name}</h3>
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            Active
          </span>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          {DEMO_PROJECT.description}
        </p>

        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Dataset:</span>{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">
              {DEMO_PROJECT.hf_dataset}
            </code>
          </div>
          <div>
            <span className="text-gray-500">Split:</span>{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">
              {DEMO_PROJECT.hf_split}
            </code>
          </div>
          <div>
            <span className="text-gray-500">Items:</span>{" "}
            {error ? (
              <span className="text-red-600 text-xs">{error}</span>
            ) : (
              <span className="font-mono">
                {itemCount?.toLocaleString() ?? "..."}
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500">Label groups:</span>{" "}
            <span>
              {Object.keys(DEMO_PROJECT.label_groups).join(", ")}
            </span>
          </div>
        </div>

        <a
          href={`/annotate?project=${DEMO_PROJECT.slug}`}
          className="inline-block rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Start Annotating
        </a>
      </div>
    </div>
  );
}
