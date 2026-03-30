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
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <h3 className="border-b border-gray-200 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Label Distribution
      </h3>
      <div className="divide-y divide-gray-100">
        {groupNames.map((groupName) => {
          const groupConfig = labelGroups[groupName]!;
          const counts = distribution[groupName] ?? {};
          const maxCount = Math.max(...Object.values(counts), 1);

          return (
            <div key={groupName} className="px-6 py-5">
              <h4 className="mb-4 text-sm font-semibold text-gray-800">
                {groupConfig.title ?? groupName}
              </h4>
              <div className="space-y-2.5">
                {groupConfig.labels.map((label) => {
                  const count = counts[label] ?? 0;
                  const barPct =
                    maxCount > 0 ? (count / maxCount) * 100 : 0;

                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className="min-w-[6rem] text-right text-xs font-medium text-gray-500">
                        {label}
                      </span>
                      <div className="h-5 flex-1 overflow-hidden rounded bg-gray-100">
                        <div
                          className="flex h-full items-center rounded bg-blue-500 transition-all duration-300"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <span className="min-w-[3.5rem] text-right text-xs font-medium tabular-nums text-gray-500">
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
