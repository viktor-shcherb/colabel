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

export function LabelGroup({
  groupName,
  groupConfig,
  value,
  onChange,
}: LabelGroupProps) {
  const selectedValues = value ?? [];

  if (groupConfig.single_choice) {
    return (
      <div className="mb-3">
        {groupConfig.title && (
          <div className="mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
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
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors cursor-pointer
                ${
                  selectedValues.includes(label)
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
            >
              {label}
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </div>
    );
  }

  return (
    <div className="mb-3">
      {groupConfig.title && (
        <div className="mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
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
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors cursor-pointer
              ${
                selectedValues.includes(label)
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
          >
            {label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}
