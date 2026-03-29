"use client";

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

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => onNavigate(currentIndex - 1)}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10 12L6 8L10 4" />
        </svg>
        <span className="hidden sm:inline">Prev</span>
      </button>

      <div className="flex-1">
        <Slider.Root
          className="relative flex h-5 w-full touch-none select-none items-center"
          value={[currentIndex]}
          min={0}
          max={Math.max(0, itemCount - 1)}
          step={1}
          onValueChange={([val]) => {
            if (val !== undefined && val !== currentIndex) {
              onNavigate(val);
            }
          }}
        >
          <Slider.Track className="relative h-1.5 grow rounded-full bg-gray-200">
            <Slider.Range className="absolute h-full rounded-full bg-blue-600" />
          </Slider.Track>
          <Slider.Thumb className="block h-4 w-4 rounded-full border-2 border-blue-600 bg-white shadow-sm transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2" />
        </Slider.Root>
      </div>

      <div className="min-w-[90px] rounded-md bg-gray-100 px-3 py-1.5 text-center text-sm font-medium tabular-nums text-gray-600">
        {annotatedCount} / {itemCount.toLocaleString()}
      </div>

      <button
        type="button"
        disabled={!canNext}
        onClick={() => onNavigate(currentIndex + 1)}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="hidden sm:inline">Next</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 4L10 8L6 12" />
        </svg>
      </button>
    </div>
  );
}
