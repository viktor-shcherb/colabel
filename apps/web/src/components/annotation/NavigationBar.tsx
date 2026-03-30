"use client";

import { useState, useEffect } from "react";
import * as Slider from "@radix-ui/react-slider";

interface NavigationBarProps {
  currentIndex: number;
  itemCount: number;
  annotatedCount: number;
  onNavigate: (index: number) => void;
}

export function NavigationBar({
  currentIndex,
  itemCount,
  annotatedCount,
  onNavigate,
}: NavigationBarProps) {
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < itemCount - 1;

  // Local slider value — updates immediately on drag, without triggering fetches
  const [sliderValue, setSliderValue] = useState(currentIndex);

  // Sync local value when parent index changes (e.g., from prev/next buttons)
  useEffect(() => {
    setSliderValue(currentIndex);
  }, [currentIndex]);

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => onNavigate(currentIndex - 1)}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        &larr; Prev
      </button>

      <div className="flex-1">
        <Slider.Root
          className="relative flex h-5 w-full touch-none select-none items-center"
          value={[sliderValue]}
          min={0}
          max={Math.max(0, itemCount - 1)}
          step={1}
          onValueChange={([val]) => {
            if (val !== undefined) {
              setSliderValue(val);
            }
          }}
          onValueCommit={([val]) => {
            if (val !== undefined && val !== currentIndex) {
              onNavigate(val);
            }
          }}
        >
          <Slider.Track className="relative h-1 grow rounded-full bg-gray-200">
            <Slider.Range className="absolute h-full rounded-full bg-blue-600" />
          </Slider.Track>
          <Slider.Thumb className="block h-4 w-4 rounded-full bg-blue-600 shadow focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </Slider.Root>
      </div>

      <div className="min-w-[80px] text-center text-sm text-gray-500 tabular-nums">
        {sliderValue + 1} / {itemCount}
      </div>

      <button
        type="button"
        disabled={!canNext}
        onClick={() => onNavigate(currentIndex + 1)}
        className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next &rarr;
      </button>
    </div>
  );
}
