"use client";

import { ExpandableContent } from "./ExpandableContent";
import { LabelGroup } from "./LabelGroup";
import {
  ComparisonLabels,
  type ComparisonAnnotation,
} from "./ComparisonLabels";
import type { LabelGroupConfig } from "@/lib/projects";

interface MessageCardProps {
  role: string;
  content: string;
  messageIndex: number;
  showLabels: boolean;
  labelGroups: Record<string, LabelGroupConfig>;
  labels: Record<string, string[] | null> | null;
  onLabelChange: (
    messageIndex: number,
    groupName: string,
    value: string[],
  ) => void;
  comparisonAnnotations?: ComparisonAnnotation[];
}

const ROLE_STYLES: Record<string, string> = {
  user: "bg-gray-50 border-gray-200",
  assistant: "bg-blue-50 border-blue-200",
  system: "bg-amber-50 border-amber-200",
};

const ROLE_HEADER_STYLES: Record<string, string> = {
  user: "text-gray-700",
  assistant: "text-blue-700",
  system: "text-amber-700",
};

export function MessageCard({
  role,
  content,
  messageIndex,
  showLabels,
  labelGroups,
  labels,
  onLabelChange,
  comparisonAnnotations,
}: MessageCardProps) {
  const cardStyle = ROLE_STYLES[role] ?? "bg-gray-50 border-gray-200";
  const headerStyle = ROLE_HEADER_STYLES[role] ?? "text-gray-700";

  return (
    <div className={`rounded-lg border p-4 ${cardStyle}`}>
      <div className={`mb-2 text-sm font-bold ${headerStyle}`}>{role}</div>
      <div className="text-sm text-gray-800">
        <ExpandableContent content={content} />
      </div>
      {showLabels && (
        <div className="mt-4 border-t border-gray-200 pt-3">
          {Object.entries(labelGroups).map(([groupName, groupConfig]) => (
            <LabelGroup
              key={groupName}
              groupName={groupName}
              groupConfig={groupConfig}
              value={labels?.[groupName] ?? null}
              onChange={(gn, val) => onLabelChange(messageIndex, gn, val)}
            />
          ))}
          {comparisonAnnotations && comparisonAnnotations.length > 0 && (
            <ComparisonLabels
              annotations={comparisonAnnotations}
              messageIndex={messageIndex}
              labelGroupNames={Object.keys(labelGroups)}
            />
          )}
        </div>
      )}
    </div>
  );
}
