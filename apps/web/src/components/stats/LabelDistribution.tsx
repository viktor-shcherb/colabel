import type { LabelGroupConfig } from "@/lib/projects";

interface LabelDistributionProps {
  /** Map of group name -> label value -> count */
  distribution: Record<string, Record<string, number>>;
  /** Label group configs for display titles and ordering */
  labelGroups: Record<string, LabelGroupConfig>;
}

export function LabelDistribution({
  distribution,
  labelGroups,
}: LabelDistributionProps) {
  const groupNames = Object.keys(labelGroups);

  if (groupNames.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200">
      <h3 className="border-b border-gray-200 px-6 py-3 text-sm font-medium text-gray-700">
        Label Distribution
      </h3>
      <div className="divide-y divide-gray-100">
        {groupNames.map((groupName) => {
          const groupConfig = labelGroups[groupName]!;
          const counts = distribution[groupName] ?? {};
          const maxCount = Math.max(...Object.values(counts), 1);

          return (
            <div key={groupName} className="px-6 py-4">
              <h4 className="mb-3 text-sm font-medium text-gray-800">
                {groupConfig.title ?? groupName}
              </h4>
              <div className="space-y-2">
                {groupConfig.labels.map((label) => {
                  const count = counts[label] ?? 0;
                  const barPct =
                    maxCount > 0 ? (count / maxCount) * 100 : 0;

                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className="min-w-[5rem] text-right text-xs text-gray-600">
                        {label}
                      </span>
                      <div className="h-4 flex-1 overflow-hidden rounded bg-gray-100">
                        <div
                          className="h-full rounded bg-blue-500 transition-all"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <span className="min-w-[3rem] text-right text-xs tabular-nums text-gray-500">
                        {count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
