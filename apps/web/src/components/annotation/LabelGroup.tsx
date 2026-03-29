"use client";

import * as ToggleGroup from "@radix-ui/react-toggle-group";
import * as RadioGroup from "@radix-ui/react-radio-group";
import type { LabelGroupConfig } from "@/lib/projects";

interface LabelGroupProps {
  groupName: string;
  groupConfig: LabelGroupConfig;
  value: string[] | null;
  onChange: (groupName: string, value: string[]) => void;
}

const selectedClass =
  "border-blue-600 bg-blue-600 text-white shadow-sm";
const unselectedClass =
  "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50";

export function LabelGroup({
  groupName,
  groupConfig,
  value,
  onChange,
}: LabelGroupProps) {
  const selectedValues = value ?? [];

  if (groupConfig.single_choice) {
    return (
      <div>
        {groupConfig.title && (
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            {groupConfig.title}
          </div>
        )}
        <RadioGroup.Root
          value={selectedValues[0] ?? ""}
          onValueChange={(val) => onChange(groupName, val ? [val] : [])}
          className="flex flex-wrap gap-2"
        >
          {groupConfig.labels.map((label) => (
            <RadioGroup.Item
              key={label}
              value={label}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-all
                ${selectedValues.includes(label) ? selectedClass : unselectedClass}`}
            >
              {label}
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </div>
    );
  }

  return (
    <div>
      {groupConfig.title && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {groupConfig.title}
        </div>
      )}
      <ToggleGroup.Root
        type="multiple"
        value={selectedValues}
        onValueChange={(val) => onChange(groupName, val)}
        className="flex flex-wrap gap-2"
      >
        {groupConfig.labels.map((label) => (
          <ToggleGroup.Item
            key={label}
            value={label}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-all
              ${selectedValues.includes(label) ? selectedClass : unselectedClass}`}
          >
            {label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}
