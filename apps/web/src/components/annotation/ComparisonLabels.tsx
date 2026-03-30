"use client";

import type { Labels } from "@/lib/schemas/annotation";

export interface ComparisonAnnotation {
  userId: string;
  userName: string | null;
  labels: Labels;
}

interface ComparisonLabelsProps {
  annotations: ComparisonAnnotation[];
  messageIndex: number;
  labelGroupNames: string[];
}

export function ComparisonLabels({
  annotations,
  messageIndex,
  labelGroupNames,
}: ComparisonLabelsProps) {
  // Only show annotators who have non-null labels for this message
  const relevantAnnotations = annotations.filter((a) => {
    const msgLabels = a.labels[messageIndex];
    if (!msgLabels) return false;
    return labelGroupNames.some((gn) => {
      const val = msgLabels[gn];
      return val !== null && val !== undefined && val.length > 0;
    });
  });

  if (relevantAnnotations.length === 0) return null;

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <div className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
        Comparison
      </div>
      <div className="space-y-2">
        {relevantAnnotations.map((ann) => (
          <div key={ann.userId} className="flex items-start gap-2">
            <span className="shrink-0 text-xs font-medium text-gray-500 mt-0.5 min-w-[60px]">
              {ann.userName ?? "Unknown"}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {labelGroupNames.map((gn) => {
                const values = ann.labels[messageIndex]?.[gn];
                if (!values || values.length === 0) return null;
                return values.map((v) => (
                  <span
                    key={`${gn}-${v}`}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-500"
                  >
                    {v}
                  </span>
                ));
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
