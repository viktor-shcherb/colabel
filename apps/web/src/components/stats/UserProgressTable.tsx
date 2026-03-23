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
    <div className="rounded-lg border border-gray-200">
      <h3 className="border-b border-gray-200 px-6 py-3 text-sm font-medium text-gray-700">
        Per-User Progress
      </h3>
      {sorted.length === 0 ? (
        <p className="px-6 py-4 text-sm text-gray-400">
          No annotations yet.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-6 py-2 font-medium">Annotator</th>
              <th className="px-6 py-2 font-medium">Email</th>
              <th className="px-6 py-2 text-right font-medium">Annotations</th>
              <th className="px-6 py-2 text-right font-medium">Progress</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const pct =
                totalItems > 0
                  ? Math.min((s.count / totalItems) * 100, 100)
                  : 0;
              return (
                <tr
                  key={s.userId}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-6 py-2.5 font-medium text-gray-900">
                    {s.userName ?? "Unknown"}
                  </td>
                  <td className="px-6 py-2.5 text-gray-500">{s.userEmail}</td>
                  <td className="px-6 py-2.5 text-right tabular-nums">
                    {s.count.toLocaleString()}
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="min-w-[3rem] text-right text-xs tabular-nums text-gray-500">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
