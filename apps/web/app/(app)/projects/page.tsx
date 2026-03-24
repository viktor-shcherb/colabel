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
      <h2 className="mb-6 text-lg font-medium">Projects</h2>

      <div className="space-y-4">
        {projectsWithCounts.map(({ project, itemCount, error }) => (
          <div
            key={project.slug}
            className="rounded-lg border border-gray-200 p-6"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold">{project.name}</h3>
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Active
              </span>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              {project.description}
            </p>

            <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Dataset:</span>{" "}
                <code className="rounded bg-gray-100 px-1 text-xs">
                  {project.config.hf_dataset}
                </code>
              </div>
              <div>
                <span className="text-gray-500">Split:</span>{" "}
                <code className="rounded bg-gray-100 px-1 text-xs">
                  {project.config.hf_split}
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
                  {Object.keys(project.config.label_groups).join(", ")}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={`/annotate/${project.slug}`}
                className="inline-block rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Start Annotating
              </a>
              <a
                href={`/projects/${project.slug}/stats`}
                className="inline-block rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
