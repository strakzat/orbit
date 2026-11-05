import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { renderWithHtmlToImage, screenshotFeedback } from "../utils/screenshot";
import { SendFailureError, failureFromResponse } from "../utils/send-failure";
import { RETRY_MS } from "./use-all-comments";
import type { Comment } from "../types";

// A Notion upload takes seconds, not this: past it, the viewer hears about it.
const SEND_TIMEOUT_MS = 30_000;

interface UseCommentsProps {
  apiBase: string;
  project: string;
  annotationId: string;
  label: string;
  enabled: boolean;
  /** Feedback on a component: its name, sent with the comment. */
  component?: string;
  /** The element the viewer picked, outlined in the screenshot: for a component, one of many. */
  target?: HTMLElement | null;
}

interface UseCommentsReturn {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  submitComment: (data: { auteur: string; comment: string }) => Promise<void>;
  sendComment: (data: { auteur: string; comment: string }) => void;
}

export function useComments({
  apiBase: apiBaseProp,
  project,
  annotationId,
  label,
  enabled,
  component,
  target,
}: UseCommentsProps): UseCommentsReturn {
  const [apiBase, setApiBase] = useState(apiBaseProp || "");
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!apiBaseProp) setApiBase(window.location.origin);
  }, [apiBaseProp]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    describeVariants,
    commentsConfig,
    rememberOwnComment,
    deletedCommentIds,
    tourStep,
    allComments,
    addTourComment,
    sendFeedback,
  } = useAnnotationsSafe();
  // During the tour the threads are samples: nothing is fetched, and nothing leaves the browser.
  const touring = tourStep !== null;
  const setting = commentsConfig?.screenshot ?? true;
  const capture = setting === false ? null : setting === true ? renderWithHtmlToImage : setting;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failedAtRef = useRef(0);
  const requestRef = useRef(0);
  const warnedRef = useRef(false);

  const fetchComments = useCallback(async () => {
    if (!enabled || touring) return;
    // After a failure, again two minutes on: one blip must not end the thread until a remount.
    if (failedAtRef.current && Date.now() - failedAtRef.current < RETRY_MS) return;

    const url = `${apiBase}/api/comments?project=${encodeURIComponent(project)}&annotationId=${encodeURIComponent(annotationId)}`;
    // Only the latest request counts: a slow poll must not undo the fetch after a new comment.
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
      const message = err instanceof Error ? err.message : "Fout bij ophalen comments";
      setError(message);
      failedAtRef.current = Date.now();
      if (!warnedRef.current) {
        warnedRef.current = true;
        console.warn(`[@strakzat/orbit] Comments API niet beschikbaar: ${message}`);
      }
    }
  }, [apiBase, project, annotationId, enabled, touring]);

  useEffect(() => {
    if (!enabled || touring) {
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
  }, [fetchComments, enabled, touring]);

  /** What has to be read now, while the page is as the viewer saw it, and the sending itself. */
  const prepare = useCallback(
    (data: { auteur: string; comment: string }) => {
      const shooting = capture ? screenshotFeedback(annotationId, capture, label, target) : Promise.resolve(null);
      const url = `${apiBase}/api/comments`;
      // The variants the comment was written in, as they stand when it is sent.
      const varianten = describeVariants();
      const pagina = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";

      const deliver = async () => {
        const screenshot = await shooting;
        const send = async (withScreenshot: boolean) => {
          // A server that never answers would leave the comment on "Versturen…" for ever.
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
          return fetch(url, {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project,
              annotationId,
              auteur: data.auteur,
              comment: data.comment,
              pagina,
              label,
              ...(varianten ? { varianten } : {}),
              ...(component ? { component } : {}),
              ...(withScreenshot && screenshot ? { screenshot } : {}),
            }),
          }).finally(() => clearTimeout(timeout));
        };
        let res = await send(true);
        // A route with a body limit (Next.js: 1 MB) refuses the screenshot; the comment goes without.
        if (res.status === 413 && screenshot) res = await send(false);
        if (!res.ok) {
          const refusal = await res.json().catch(() => null);
          throw new SendFailureError(
            failureFromResponse(res.status, refusal?.code),
            `HTTP ${res.status}${refusal?.error ? `: ${refusal.error}` : ""}`
          );
        }
        // The API's key to delete it again; a route of a project's own may not give one.
        const created = await res.json().catch(() => null);
        if (typeof created?.id === "string" && typeof created.deleteToken === "string") {
          rememberOwnComment(created.id, created.deleteToken);
        }
        return typeof created?.id === "string" ? (created as { id: string }) : null;
      };

      return { varianten, deliver };
    },
    [apiBase, project, annotationId, label, component, target, describeVariants, capture, rememberOwnComment]
  );

  /** Sends and waits: for a composer that stays open, under a thread. */
  const submitComment = useCallback(
    async (data: { auteur: string; comment: string }) => {
      if (touring) return addTourComment({ ...data, annotationId, label, component });
      await prepare(data).deliver();
      // The API just answered, and the viewer waits to see their comment.
      failedAtRef.current = 0;
      await fetchComments();
    },
    [annotationId, label, component, prepare, fetchComments, touring, addTourComment]
  );

  /** Sends in the background: the comment is on the page at once, and a failure comes back. */
  const sendComment = useCallback(
    (data: { auteur: string; comment: string }) => {
      if (touring) return addTourComment({ ...data, annotationId, label, component });
      const { varianten, deliver } = prepare(data);
      sendFeedback({ ...data, annotationId, label, component, varianten: varianten || undefined }, deliver);
    },
    [annotationId, label, component, prepare, sendFeedback, touring, addTourComment]
  );

  // A comment deleted here leaves at once, not on the next poll.
  const shown = useMemo(() => {
    // Oldest first, as a thread reads, from the context's newest-first list.
    if (touring) return enabled ? allComments.filter((c) => c.annotationId === annotationId).reverse() : [];
    // On its way: in the thread now, and not twice once this thread's own fetch has it.
    const outgoing = enabled
      ? allComments.filter(
          (c) => c.delivery && c.annotationId === annotationId && !comments.some((own) => own.id === c.id)
        )
      : [];
    const thread = outgoing.length ? [...comments, ...outgoing] : comments;
    return deletedCommentIds.size ? thread.filter((c) => !deletedCommentIds.has(c.id)) : thread;
  }, [comments, deletedCommentIds, touring, enabled, allComments, annotationId]);

  return { comments: shown, isLoading, error, submitComment, sendComment };
}
