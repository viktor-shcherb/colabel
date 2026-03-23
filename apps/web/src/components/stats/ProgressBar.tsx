interface ProgressBarProps {
  annotated: number;
  total: number;
}

export function ProgressBar({ annotated, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.min((annotated / total) * 100, 100) : 0;

  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <h3 className="mb-1 text-sm font-medium text-gray-700">
        Overall Progress
      </h3>
      <p className="mb-3 text-2xl font-semibold tabular-nums">
        {annotated.toLocaleString()}{" "}
        <span className="text-base font-normal text-gray-400">
          / {total.toLocaleString()} items
        </span>
      </p>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs tabular-nums text-gray-500">
        {pct.toFixed(1)}%
      </p>
    </div>
  );
}
