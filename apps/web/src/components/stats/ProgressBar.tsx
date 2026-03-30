interface ProgressBarProps {
  annotated: number;
  total: number;
}

export function ProgressBar({ annotated, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.min((annotated / total) * 100, 100) : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Overall Progress
      </h3>
      <p className="mb-4 text-3xl font-bold tabular-nums text-gray-900">
        {annotated.toLocaleString()}{" "}
        <span className="text-base font-normal text-gray-400">
          / {total.toLocaleString()} items
        </span>
      </p>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-right text-xs font-medium tabular-nums text-gray-400">
        {pct.toFixed(1)}%
      </p>
    </div>
  );
}
