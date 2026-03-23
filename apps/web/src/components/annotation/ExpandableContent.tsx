"use client";

import { useState } from "react";

const CHAR_THRESHOLD = 300;

interface ExpandableContentProps {
  content: string;
}

export function ExpandableContent({ content }: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = content.length > CHAR_THRESHOLD;

  if (!isLong) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div>
      <div className="whitespace-pre-wrap">
        {isExpanded ? content : content.slice(0, CHAR_THRESHOLD) + "..."}
      </div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-1 text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        {isExpanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}
