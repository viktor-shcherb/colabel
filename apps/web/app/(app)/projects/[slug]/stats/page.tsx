import { notFound } from "next/navigation";
import { getProjectBySlug, type ProjectConfig } from "@/lib/projects";
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

  // Fetch all data in parallel
  const [itemCount, userStats, allLabels] = await Promise.all([
    project.config.item_count ??
      getCachedItemCount(
        project.config.hf_dataset,
        project.config.hf_config,
        project.config.hf_split,
      ),
    getAnnotationStats(project.id),
    getAllAnnotationLabels(project.id),
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
            className="text-gray-400 hover:text-gray-600"
            title="Back to projects"
          >
            &larr;
          </a>
          <h2 className="text-lg font-medium">
            {project.name} — Statistics
          </h2>
        </div>
        <a
          href={`/annotate/${project.slug}`}
          className="text-sm text-blue-600 hover:underline"
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
