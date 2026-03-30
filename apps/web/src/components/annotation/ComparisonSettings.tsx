"use client";

import { useCallback, useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";

export interface ComparisonConfig {
  mode: "always" | "on-annotate" | "never";
  selectedUserIds: string[];
}

interface Annotator {
  userId: string;
  userName: string | null;
  userEmail: string;
  count: number;
}

interface ComparisonSettingsProps {
  projectId: string;
  config: ComparisonConfig;
  onChange: (config: ComparisonConfig) => void;
}

export function ComparisonSettings({
  projectId,
  config,
  onChange,
}: ComparisonSettingsProps) {
  const [annotators, setAnnotators] = useState<Annotator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchAnnotators = useCallback(async () => {
    if (hasFetched) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/annotations/annotators?projectId=${encodeURIComponent(projectId)}`,
      );
      if (res.ok) {
        const data = (await res.json()) as { annotators: Annotator[] };
        setAnnotators(data.annotators);
      }
    } catch (err) {
      console.error("Failed to fetch annotators:", err);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [projectId, hasFetched]);

  useEffect(() => {
    if (open && !hasFetched) {
      fetchAnnotators();
    }
  }, [open, hasFetched, fetchAnnotators]);

  const handleModeChange = (mode: ComparisonConfig["mode"]) => {
    onChange({ ...config, mode });
  };

  const handleUserToggle = (userId: string) => {
    const next = config.selectedUserIds.includes(userId)
      ? config.selectedUserIds.filter((id) => id !== userId)
      : [...config.selectedUserIds, userId];
    onChange({ ...config, selectedUserIds: next });
  };

  const handleSelectAll = () => {
    const allIds = annotators.map((a) => a.userId);
    const allSelected = allIds.every((id) =>
      config.selectedUserIds.includes(id),
    );
    onChange({
      ...config,
      selectedUserIds: allSelected ? [] : allIds,
    });
  };

  const isActive = config.mode !== "never" && config.selectedUserIds.length > 0;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`text-sm px-2.5 py-1 rounded-md border transition-colors ${
            isActive
              ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          Compare
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
          sideOffset={8}
          align="end"
        >
          {/* Mode selector */}
          <div className="mb-4">
            <div className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Show comparison
            </div>
            <div className="space-y-1.5">
              {(
                [
                  { value: "always", label: "Always" },
                  { value: "on-annotate", label: "After annotating" },
                  { value: "never", label: "Never" },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
                >
                  <input
                    type="radio"
                    name="comparison-mode"
                    value={option.value}
                    checked={config.mode === option.value}
                    onChange={() => handleModeChange(option.value)}
                    className="accent-blue-600"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Annotator list */}
          {config.mode !== "never" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Annotators
                </span>
                {annotators.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {annotators.every((a) =>
                      config.selectedUserIds.includes(a.userId),
                    )
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                )}
              </div>
              {isLoading && (
                <div className="text-xs text-gray-400 py-2">Loading...</div>
              )}
              {!isLoading && annotators.length === 0 && hasFetched && (
                <div className="text-xs text-gray-400 py-2">
                  No other annotators yet
                </div>
              )}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {annotators.map((ann) => (
                  <label
                    key={ann.userId}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={config.selectedUserIds.includes(ann.userId)}
                      onChange={() => handleUserToggle(ann.userId)}
                      className="accent-blue-600"
                    />
                    <span className="truncate text-gray-700">
                      {ann.userName ?? ann.userEmail}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-gray-400">
                      {ann.count}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
