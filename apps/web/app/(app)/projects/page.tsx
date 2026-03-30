import { getAllProjects } from "@/lib/projects";
import { getCachedItemCount } from "@/lib/cache";

export default async function ProjectsPage() {
  const projects = getAllProjects();

  const projectsWithCounts = await Promise.all(
    projects.map(async (project) => {
      let itemCount: number | null = project.config.item_count ?? null;
      let error: string | null = null;

      if (!itemCount) {
        try {
          itemCount = await getCachedItemCount(
            project.config.hf_dataset,
            project.config.hf_config,
            project.config.hf_split,
          );
        } catch (e) {
          error =
            e instanceof Error ? e.message : "Failed to fetch item count";
        }
      }

      return { project, itemCount, error };
    }),
  );

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">
          Projects
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Select a project to begin annotating or view statistics.
        </p>
      </div>

      {projectsWithCounts.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No projects available. Contact an administrator to get started.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {projectsWithCounts.map(({ project, itemCount, error }) => (
          <div
            key={project.slug}
            className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Title + badge */}
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-900">
                {project.name}
              </h3>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                Active
              </span>
            </div>

            {/* Description */}
            <p className="mb-4 text-sm leading-relaxed text-gray-500">
              {project.description}
            </p>

            {/* Metadata grid */}
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Dataset
                </span>
                <code className="truncate rounded bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600">
                  {project.config.hf_dataset}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Split
                </span>
                <code className="rounded bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600">
                  {project.config.hf_split}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Items
                </span>
                {error ? (
                  <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600">
                    {error}
                  </span>
                ) : (
                  <span className="tabular-nums text-gray-700">
                    {itemCount?.toLocaleString() ?? "..."}
                  </span>
                )}
              </div>
            </div>

            {/* Label groups */}
            <div className="mb-5">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400">
                Label groups
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(project.config.label_groups).map(
                  ([name, cfg]) => (
                    <span
                      key={name}
                      className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                    >
                      {cfg.title ?? name}
                      <span className="ml-1 text-gray-400">
                        ({cfg.labels.length})
                      </span>
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <a
                href={`/annotate/${project.slug}`}
                className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-700"
              >
                Start Annotating
              </a>
              <a
                href={`/projects/${project.slug}/stats`}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                View Stats
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
