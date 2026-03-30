"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCard } from "./MessageCard";
import { NavigationBar } from "./NavigationBar";
import {
  ComparisonSettings,
  type ComparisonConfig,
} from "./ComparisonSettings";
import type { ComparisonAnnotation } from "./ComparisonLabels";
import { saveAnnotationAction } from "@/lib/actions/annotations";
import type { ProjectConfig } from "@/lib/projects";
import type { Labels } from "@/lib/schemas/annotation";

interface ChatMessage {
  role: string;
  content: string;
}

interface AnnotationPageProps {
  projectId: string;
  projectSlug: string;
  projectName: string;
  instructions: string | null;
  config: ProjectConfig;
  initialIndex?: number;
}

export function AnnotationPage({
  projectId,
  projectSlug,
  projectName,
  instructions,
  config,
  initialIndex,
}: AnnotationPageProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Priority: 1) ?item= param, 2) sessionStorage, 3) 0
    if (initialIndex !== undefined) return initialIndex;
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(`colabel-idx-${projectSlug}`);
        if (stored) return Math.max(0, parseInt(stored, 10) || 0);
      } catch { /* ignore */ }
    }
    return 0;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [annotation, setAnnotation] = useState<Labels>([]);
  const [itemCount, setItemCount] = useState(0);
  const [annotatedCount, setAnnotatedCount] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [comparisonConfig, setComparisonConfig] = useState<ComparisonConfig>(
    { mode: "never", selectedUserIds: [] },
  );
  const [comparisonAnnotations, setComparisonAnnotations] = useState<
    ComparisonAnnotation[]
  >([]);

  const comparisonConfigRef = useRef(comparisonConfig);

  const isDirtyRef = useRef(isDirty);
  const annotationRef = useRef(annotation);
  const currentIndexRef = useRef(currentIndex);
  const isSavingRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);
  useEffect(() => {
    annotationRef.current = annotation;
  }, [annotation]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  // Hydrate comparisonConfig from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`colabel-comparison-${projectId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as ComparisonConfig;
        setComparisonConfig(parsed);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    comparisonConfigRef.current = comparisonConfig;
    try {
      localStorage.setItem(
        `colabel-comparison-${projectId}`,
        JSON.stringify(comparisonConfig),
      );
    } catch {
      // ignore
    }
  }, [comparisonConfig, projectId]);

  const fetchComparison = useCallback(
    async (itemIndex: number) => {
      const cfg = comparisonConfigRef.current;
      if (cfg.mode === "never" || cfg.selectedUserIds.length === 0) {
        setComparisonAnnotations([]);
        return;
      }
      try {
        const userIds = cfg.selectedUserIds.join(",");
        const res = await fetch(
          `/api/annotations/compare?projectId=${encodeURIComponent(projectId)}&itemIndex=${itemIndex}&userIds=${encodeURIComponent(userIds)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as {
            annotations: ComparisonAnnotation[];
          };
          setComparisonAnnotations(data.annotations);
        }
      } catch (err) {
        console.error("Failed to fetch comparison:", err);
      }
    },
    [projectId],
  );

  const fetchItem = useCallback(
    async (index: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/items?project=${encodeURIComponent(projectSlug)}&index=${index}&window=5`,
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? `HTTP ${res.status}`,
          );
        }
        const data = (await res.json()) as {
          item: Record<string, unknown> | null;
          itemCount: number;
          annotation: Labels | null;
        };

        if (!data.item) {
          throw new Error("Item not found");
        }

        const conversation = (data.item.conversation as ChatMessage[]) ?? [];
        setMessages(conversation);
        setItemCount(data.itemCount);

        // Initialize annotation structure: one dict per message
        if (data.annotation) {
          setAnnotation(data.annotation);
        } else {
          const emptyLabels: Labels = conversation.map(() => {
            const groups: Record<string, string[] | null> = {};
            for (const groupName of Object.keys(config.label_groups)) {
              groups[groupName] = null;
            }
            return groups;
          });
          setAnnotation(emptyLabels);
        }
        setIsDirty(false);

        // Fetch comparison data based on mode
        const cfg = comparisonConfigRef.current;
        if (cfg.mode === "always" && cfg.selectedUserIds.length > 0) {
          fetchComparison(index);
        } else if (
          cfg.mode === "on-annotate" &&
          cfg.selectedUserIds.length > 0 &&
          data.annotation
        ) {
          // Item already has annotation, show comparison immediately
          fetchComparison(index);
        } else {
          setComparisonAnnotations([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load item");
      } finally {
        setIsLoading(false);
      }
    },
    [projectSlug, config.label_groups, fetchComparison],
  );

  // Persist index to sessionStorage + URL
  const persistIndex = useCallback((index: number) => {
    try {
      sessionStorage.setItem(`colabel-idx-${projectSlug}`, String(index));
    } catch { /* ignore */ }
    const url = new URL(window.location.href);
    url.searchParams.set("item", String(index));
    window.history.replaceState(null, "", url.toString());
  }, [projectSlug]);

  // Load initial item
  useEffect(() => {
    const startIndex = currentIndexRef.current;
    persistIndex(startIndex);
    fetchItem(startIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCurrentAnnotation = useCallback(async () => {
    if (!isDirtyRef.current || isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      await saveAnnotationAction({
        projectId,
        itemIndex: currentIndexRef.current,
        labels: annotationRef.current,
      });
      setAnnotatedCount((prev) => prev + 1);

      // Fetch comparison after save in on-annotate mode
      const cfg = comparisonConfigRef.current;
      if (cfg.mode === "on-annotate" && cfg.selectedUserIds.length > 0) {
        fetchComparison(currentIndexRef.current);
      }
    } catch (err) {
      console.error("Failed to save annotation:", err);
    } finally {
      isSavingRef.current = false;
    }
  }, [projectId, fetchComparison]);

  const navigate = useCallback(
    async (newIndex: number) => {
      if (newIndex < 0 || newIndex >= itemCount || newIndex === currentIndex) {
        return;
      }
      await saveCurrentAnnotation();
      setComparisonAnnotations([]);
      setCurrentIndex(newIndex);
      persistIndex(newIndex);
      await fetchItem(newIndex);
    },
    [currentIndex, itemCount, saveCurrentAnnotation, fetchItem, persistIndex],
  );

  const handleComparisonConfigChange = useCallback(
    (newConfig: ComparisonConfig) => {
      setComparisonConfig(newConfig);
      // If switching to "always" with annotators selected, fetch immediately
      if (
        newConfig.mode === "always" &&
        newConfig.selectedUserIds.length > 0
      ) {
        comparisonConfigRef.current = newConfig;
        fetchComparison(currentIndexRef.current);
      } else if (newConfig.mode === "never") {
        setComparisonAnnotations([]);
      }
    },
    [fetchComparison],
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigate(currentIndexRef.current - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigate(currentIndexRef.current + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const handleLabelChange = useCallback(
    (messageIndex: number, groupName: string, value: string[]) => {
      setAnnotation((prev) => {
        const next = [...prev];
        const msgLabels = { ...(next[messageIndex] ?? {}) };
        msgLabels[groupName] = value;
        next[messageIndex] = msgLabels;
        return next;
      });
      setIsDirty(true);
    },
    [],
  );

  const annotateRoles = config.chat_options.annotate_roles;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/projects"
            className="text-gray-400 hover:text-gray-600"
            title="Back to projects"
          >
            &larr;
          </a>
          <h2 className="text-lg font-medium">{projectName}</h2>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={`/projects/${projectSlug}/stats`}
            className="text-sm text-blue-600 hover:underline"
          >
            Stats
          </a>
          <ComparisonSettings
            projectId={projectId}
            config={comparisonConfig}
            onChange={handleComparisonConfigChange}
          />
          <span className="text-sm text-gray-500 tabular-nums">
            Item {currentIndex + 1}
            {itemCount > 0 && ` of ${itemCount.toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Instructions */}
      {instructions && (
        <div className="rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span>Instructions</span>
            <span className="text-gray-400">
              {showInstructions ? "\u25B2" : "\u25BC"}
            </span>
          </button>
          {showInstructions && (
            <div className="border-t border-gray-200 px-4 py-3 text-sm text-gray-600 whitespace-pre-wrap">
              {instructions}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading && (
        <div className="py-12 text-center text-gray-400">Loading item...</div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          {messages.map((msg, idx) => (
            <MessageCard
              key={`${currentIndex}-${idx}`}
              role={msg.role}
              content={msg.content}
              messageIndex={idx}
              showLabels={annotateRoles.includes(msg.role)}
              labelGroups={config.label_groups}
              labels={annotation[idx] ?? null}
              onLabelChange={handleLabelChange}
              comparisonAnnotations={
                comparisonAnnotations.length > 0
                  ? comparisonAnnotations
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Navigation — always visible once we know itemCount */}
      {itemCount > 0 && (
        <div className="sticky bottom-0 border-t border-gray-200 bg-white py-3">
          <NavigationBar
            currentIndex={currentIndex}
            itemCount={itemCount}
            annotatedCount={annotatedCount}
            onNavigate={navigate}
          />
        </div>
      )}
    </div>
  );
}
