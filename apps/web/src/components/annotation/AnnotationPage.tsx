"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCard } from "./MessageCard";
import { NavigationBar } from "./NavigationBar";
import {
  ComparisonSettings,
  type ComparisonConfig,
} from "./ComparisonSettings";
import type { ComparisonAnnotation } from "./ComparisonLabels";
import Markdown from "react-markdown";
import { saveAnnotationAction } from "@/lib/actions/annotations";
import type { LabelGroupConfig, ProjectConfig } from "@/lib/projects";
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
  const hasLoadedOnce = useRef(false);
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
      if (!hasLoadedOnce.current) setIsLoading(true);
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

        // Initialize annotation structure: one dict per message, with each
        // dict containing only the label groups that apply to that message's
        // role (groups without a `roles` field apply to every annotated role).
        if (data.annotation) {
          setAnnotation(data.annotation);
        } else {
          const emptyLabels: Labels = conversation.map((msg) => {
            const groups: Record<string, string[] | null> = {};
            for (const [groupName, g] of Object.entries(config.label_groups)) {
              if (!g.roles || g.roles.includes(msg.role)) {
                groups[groupName] = null;
              }
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
        hasLoadedOnce.current = true;
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

  // Per-role label group filtering. A label group with `roles: [...]` only
  // renders for matching turn roles; a group without `roles` applies to
  // every annotated role (back-compat with existing single-role projects).
  const labelGroupsByRole = useMemo(() => {
    const cache: Record<string, Record<string, LabelGroupConfig>> = {};
    for (const role of annotateRoles) {
      cache[role] = Object.fromEntries(
        Object.entries(config.label_groups).filter(
          ([, g]) => !g.roles || g.roles.includes(role),
        ),
      );
    }
    return cache;
  }, [annotateRoles, config.label_groups]);

  return (
    <div className="pb-20">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/projects"
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Back to projects"
              aria-label="Back to projects"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 12L6 8L10 4" />
              </svg>
            </a>
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">
              {projectName}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/projects/${projectSlug}/stats`}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              Stats
            </a>
            <ComparisonSettings
              projectId={projectId}
              config={comparisonConfig}
              onChange={handleComparisonConfigChange}
            />
            <span className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium tabular-nums text-gray-600">
              Item {currentIndex + 1}
              {itemCount > 0 && ` / ${itemCount.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* Instructions */}
        {instructions && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              aria-expanded={showInstructions}
            >
              <span>Instructions</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${showInstructions ? "rotate-180" : ""}`}
              >
                <path d="M4 6L8 10L12 6" />
              </svg>
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${showInstructions ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-gray-200 px-4 py-3 text-sm leading-relaxed text-gray-600 prose prose-sm prose-gray max-w-none">
                  <Markdown>{instructions}</Markdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content — min-height prevents layout shift during loading */}
        <div className="min-h-[200px]">
          {isLoading && (
            <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white py-16">
              <div className="text-center">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
                <p className="text-sm text-gray-400">Loading item...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="mt-0.5 shrink-0 text-red-500"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Failed to load item
                  </h3>
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                  <button
                    type="button"
                    onClick={() => fetchItem(currentIndex)}
                    className="mt-2 text-sm font-medium text-red-700 underline decoration-red-300 underline-offset-2 hover:text-red-800"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <MessageCard
                  key={`${currentIndex}-${idx}`}
                  role={msg.role}
                  content={msg.content}
                  messageIndex={idx}
                  showLabels={annotateRoles.includes(msg.role)}
                  labelGroups={
                    labelGroupsByRole[msg.role] ?? config.label_groups
                  }
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
        </div>
      </div>

      {/* Navigation — fixed to bottom of viewport */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] backdrop-blur-sm">
          <div className="mx-auto max-w-5xl">
            <NavigationBar
              currentIndex={currentIndex}
              itemCount={itemCount}
              annotatedCount={annotatedCount}
              onNavigate={navigate}
            />
          </div>
        </div>
      )}
    </div>
  );
}
