import type { UserAnnotationStat } from "@/lib/queries/annotations";

interface UserProgressTableProps {
  stats: UserAnnotationStat[];
  totalItems: number;
}

export function UserProgressTable({
  stats,
  totalItems,
}: UserProgressTableProps) {
  const sorted = [...stats].sort((a, b) => b.count - a.count);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <h3 className="border-b border-gray-200 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Per-User Progress
      </h3>
      {sorted.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-gray-400">
          No annotations yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="px-6 py-3 font-semibold">Annotator</th>
                <th className="hidden px-6 py-3 font-semibold sm:table-cell">
                  Email
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Annotations
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((s) => {
                const pct =
                  totalItems > 0
                    ? Math.min((s.count / totalItems) * 100, 100)
                    : 0;
                return (
                  <tr
                    key={s.userId}
                    className="transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {s.userName ?? "Unknown"}
                    </td>
                    <td className="hidden px-6 py-3 text-gray-500 sm:table-cell">
                      {s.userEmail}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                      {s.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="min-w-[3rem] text-right text-xs font-medium tabular-nums text-gray-400">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
