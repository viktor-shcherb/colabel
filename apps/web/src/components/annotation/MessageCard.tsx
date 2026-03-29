"use client";

import { ExpandableContent } from "./ExpandableContent";
import { LabelGroup } from "./LabelGroup";
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
}

const ROLE_STYLES: Record<string, string> = {
  user: "border-gray-200 bg-white",
  assistant: "border-blue-100 bg-blue-50/50",
  system: "border-amber-100 bg-amber-50/50",
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  user: "bg-gray-100 text-gray-600",
  assistant: "bg-blue-100 text-blue-700",
  system: "bg-amber-100 text-amber-700",
};

export function MessageCard({
  role,
  content,
  messageIndex,
  showLabels,
  labelGroups,
  labels,
  onLabelChange,
}: MessageCardProps) {
  const cardStyle = ROLE_STYLES[role] ?? "border-gray-200 bg-white";
  const badgeStyle = ROLE_BADGE_STYLES[role] ?? "bg-gray-100 text-gray-600";

  return (
    <div
      className={`rounded-lg border shadow-sm ${cardStyle}`}
    >
      {/* Role badge + content */}
      <div className="p-5">
        <div className="mb-3">
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${badgeStyle}`}
          >
            {role}
          </span>
        </div>
        <div className="text-sm leading-relaxed text-gray-800">
          <ExpandableContent content={content} />
        </div>
      </div>

      {/* Label groups */}
      {showLabels && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
          <div className="space-y-3">
            {Object.entries(labelGroups).map(([groupName, groupConfig]) => (
              <LabelGroup
                key={groupName}
                groupName={groupName}
                groupConfig={groupConfig}
                value={labels?.[groupName] ?? null}
                onChange={(gn, val) => onLabelChange(messageIndex, gn, val)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
