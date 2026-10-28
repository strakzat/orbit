import { useState, useEffect, useCallback, useRef } from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { renderWithHtmlToImage, screenshotFeedback } from "../utils/screenshot";
import type { Comment } from "../types";

interface UseCommentsProps {
  apiBase: string;
  project: string;
  annotationId: string;
  label: string;
  enabled: boolean;
}

interface UseCommentsReturn {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  submitComment: (data: { auteur: string; comment: string }) => Promise<void>;
}

export function useComments({
  apiBase: apiBaseProp,
  project,
  annotationId,
  label,
  enabled,
}: UseCommentsProps): UseCommentsReturn {
  const [apiBase, setApiBase] = useState(apiBaseProp || "");
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!apiBaseProp) setApiBase(window.location.origin);
  }, [apiBaseProp]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { describeVariants, commentsConfig } = useAnnotationsSafe();
  const setting = commentsConfig?.screenshot ?? true;
  const capture = setting === false ? null : setting === true ? renderWithHtmlToImage : setting;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failedRef = useRef(false);
  const warnedRef = useRef(false);

  const fetchComments = useCallback(async () => {
    if (!enabled || failedRef.current) return;

    const url = `${apiBase}/api/comments?project=${encodeURIComponent(project)}&annotationId=${encodeURIComponent(annotationId)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Comment[] = await res.json();
      setComments(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fout bij ophalen comments";
      setError(message);
      failedRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!warnedRef.current) {
        warnedRef.current = true;
        console.warn(`[@strakzat/orbit] Comments API niet beschikbaar: ${message}`);
      }
    }
  }, [apiBase, project, annotationId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setComments([]);
      return;
    }

    setIsLoading(true);
    fetchComments().finally(() => setIsLoading(false));

    intervalRef.current = setInterval(fetchComments, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchComments, enabled]);

  const submitComment = useCallback(
    async (data: { auteur: string; comment: string }) => {
      // First, while the page is still as the viewer saw it.
      const shooting = capture ? screenshotFeedback(annotationId, capture) : Promise.resolve(null);
      const url = `${apiBase}/api/comments`;
      // The variants the comment was written in, as they stand when it is sent.
      const varianten = describeVariants();
      const screenshot = await shooting;
      const send = (withScreenshot: boolean) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project,
            annotationId,
            auteur: data.auteur,
            comment: data.comment,
            pagina: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/",
            label,
            ...(varianten ? { varianten } : {}),
            ...(withScreenshot && screenshot ? { screenshot } : {}),
          }),
        });
      let res = await send(true);
      // A route with a body limit (Next.js: 1 MB) refuses the screenshot; the comment goes without.
      if (res.status === 413 && screenshot) res = await send(false);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchComments();
    },
    [apiBase, project, annotationId, label, describeVariants, capture, fetchComments]
  );

  return { comments, isLoading, error, submitComment };
}
