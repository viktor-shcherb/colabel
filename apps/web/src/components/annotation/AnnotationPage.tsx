"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCard } from "./MessageCard";
import { NavigationBar } from "./NavigationBar";
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
}

export function AnnotationPage({
  projectId,
  projectSlug,
  projectName,
  instructions,
  config,
}: AnnotationPageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [annotation, setAnnotation] = useState<Labels>([]);
  const [itemCount, setItemCount] = useState(0);
  const [annotatedCount, setAnnotatedCount] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load item");
      } finally {
        setIsLoading(false);
      }
    },
    [projectSlug, config.label_groups],
  );

  // Load initial item
  useEffect(() => {
    fetchItem(0);
  }, [fetchItem]);

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
    } catch (err) {
      console.error("Failed to save annotation:", err);
    } finally {
      isSavingRef.current = false;
    }
  }, [projectId]);

  const navigate = useCallback(
    async (newIndex: number) => {
      if (newIndex < 0 || newIndex >= itemCount || newIndex === currentIndex) {
        return;
      }
      await saveCurrentAnnotation();
      setCurrentIndex(newIndex);
      await fetchItem(newIndex);
    },
    [currentIndex, itemCount, saveCurrentAnnotation, fetchItem],
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
        <div className="flex items-center gap-4">
          <a
            href={`/projects/${projectSlug}/stats`}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            Stats
          </a>
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
              <div className="border-t border-gray-200 px-4 py-3 text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                {instructions}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white py-16">
          <div className="text-center">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
            <p className="text-sm text-gray-400">Loading item...</p>
          </div>
        </div>
      )}

      {/* Error state */}
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

      {/* Messages */}
      {!isLoading && !error && (
        <div className="space-y-4">
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
            />
          ))}
        </div>
      )}

      {/* Navigation */}
      {!isLoading && !error && itemCount > 0 && (
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
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
