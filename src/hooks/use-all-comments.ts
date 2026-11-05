import { useState, useEffect, useCallback, useRef } from "react";
import type { Comment } from "../types";

export const RETRY_MS = 120_000;

interface UseAllCommentsProps {
  apiBase: string;
  project: string;
  enabled: boolean;
}

interface UseAllCommentsReturn {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  /** Fetches now, past the retry wait: after a comment is sent, its pin and count show at once. */
  refresh: () => Promise<void>;
}

export function useAllComments({
  apiBase: apiBaseProp,
  project,
  enabled,
}: UseAllCommentsProps): UseAllCommentsReturn {
  const [apiBase, setApiBase] = useState(apiBaseProp || "");
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!apiBaseProp) setApiBase(window.location.origin);
  }, [apiBaseProp]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failedAtRef = useRef(0);
  const requestRef = useRef(0);
  const warnedRef = useRef(false);

  const fetchComments = useCallback(async () => {
    if (!enabled) return;
    // A hidden tab waits: the rail's count is read when the tab is back, on the next tick.
    if (typeof document !== "undefined" && document.hidden) return;
    // After a failure, try again two minutes on instead of every 30 seconds, rather than never:
    // a blip at load would otherwise leave the count at 0 for the whole visit.
    if (failedAtRef.current && Date.now() - failedAtRef.current < RETRY_MS) return;

    const url = `${apiBase}/api/comments?project=${encodeURIComponent(project)}`;
    // Only the latest request counts: a slow poll must not undo the refresh after a new comment.
    const request = ++requestRef.current;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Comment[] = await res.json();
      if (request !== requestRef.current) return;
      setComments(data);
      setError(null);
      failedAtRef.current = 0;
    } catch (err) {
      if (request !== requestRef.current) return;
      const message = err instanceof Error ? err.message : "Fout bij ophalen feedback";
      setError(message);
      failedAtRef.current = Date.now();
      if (!warnedRef.current) {
        warnedRef.current = true;
        console.warn(`[@strakzat/orbit] Comments API niet beschikbaar: ${message}`);
      }
    }
  }, [apiBase, project, enabled]);

  useEffect(() => {
    if (!enabled) {
      setComments([]);
      return;
    }

    setIsLoading(true);
    fetchComments().finally(() => setIsLoading(false));

    intervalRef.current = setInterval(fetchComments, 30_000);
    return () => {
      requestRef.current += 1;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchComments, enabled]);

  const refresh = useCallback(async () => {
    failedAtRef.current = 0;
    await fetchComments();
  }, [fetchComments]);

  return { comments, isLoading, error, refresh };
}
