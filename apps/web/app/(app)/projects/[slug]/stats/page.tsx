import { notFound } from "next/navigation";
import { getProjectBySlug, type ProjectConfig } from "@/lib/projects";
import { getDbProject } from "@/lib/queries/projects";
import { getCachedItemCount } from "@/lib/cache";
import {
  getAnnotationStats,
  getAllAnnotationLabels,
} from "@/lib/queries/annotations";
import { ProgressBar } from "@/components/stats/ProgressBar";
import { UserProgressTable } from "@/components/stats/UserProgressTable";
import { LabelDistribution } from "@/components/stats/LabelDistribution";
import type { Labels } from "@/lib/schemas/annotation";

/**
 * Aggregate label distribution from all annotations for a project.
 * Returns a map of group name -> label value -> count.
 */
function computeLabelDistribution(
  rows: { labels: unknown }[],
  config: ProjectConfig,
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  // Initialize with zeros
  for (const [groupName, groupConfig] of Object.entries(config.label_groups)) {
    result[groupName] = {};
    for (const label of groupConfig.labels) {
      result[groupName]![label] = 0;
    }
  }

  for (const row of rows) {
    const labels = row.labels as Labels | null;
    if (!Array.isArray(labels)) continue;

    for (const msgLabels of labels) {
      if (!msgLabels || typeof msgLabels !== "object") continue;

      for (const [groupName, values] of Object.entries(msgLabels)) {
        if (!Array.isArray(values) || !result[groupName]) continue;
        for (const v of values) {
          if (typeof v === "string" && result[groupName]![v] !== undefined) {
            result[groupName]![v]!++;
          }
        }
      }
    }
  }

  return result;
}

export default async function ProjectStatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const dbProject = await getDbProject(slug);
  if (!dbProject) notFound();

  // Fetch all data in parallel
  const [itemCount, userStats, allLabels] = await Promise.all([
    project.config.item_count ??
      getCachedItemCount(
        project.config.hf_dataset,
        project.config.hf_config,
        project.config.hf_split,
      ),
    getAnnotationStats(dbProject.id),
    getAllAnnotationLabels(dbProject.id),
  ]);

  const totalAnnotated = userStats.reduce((sum, s) => sum + s.count, 0);
  const distribution = computeLabelDistribution(allLabels, project.config);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/projects"
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Back to projects"
            aria-label="Back to projects"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 12L6 8L10 4" />
            </svg>
          </a>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">
              {project.name}
            </h2>
            <p className="text-sm text-gray-500">Statistics</p>
          </div>
        </div>
        <a
          href={`/annotate/${project.slug}`}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-700"
        >
          Annotate
        </a>
      </div>

      {/* Overall progress */}
      <ProgressBar
        annotated={totalAnnotated}
        total={itemCount}
      />

      {/* Per-user table */}
      <UserProgressTable stats={userStats} totalItems={itemCount} />

      {/* Label distribution */}
      <LabelDistribution
        distribution={distribution}
        labelGroups={project.config.label_groups}
      />
    </div>
  );
}
