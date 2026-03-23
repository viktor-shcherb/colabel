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
        <div className="text-sm text-gray-500 tabular-nums">
          Item {currentIndex + 1}
          {itemCount > 0 && ` of ${itemCount.toLocaleString()}`}
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
            />
          ))}
        </div>
      )}

      {/* Navigation */}
      {!isLoading && !error && itemCount > 0 && (
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
