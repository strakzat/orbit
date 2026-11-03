import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { Comment } from "../types";

/**
 * What the viewer has read, per project on this origin: for each thread, the comments that were
 * in it when it was last open. `{ [project]: { [annotationId]: key[] } }`.
 */
const STORAGE_KEY = "@strakzat/orbit:seen";

type Seen = Record<string, string[]>;

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** A comment, and again once it has an answer: an answer is something new to read as well. */
function keyOf(comment: Comment): string {
  return comment.antwoord ? `${comment.id}+antwoord` : comment.id;
}

function loadAll(): Record<string, Seen> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function save(project: string, seen: Seen) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadAll(), [project]: seen }));
  } catch {
    // Storage refused: what was read is remembered as long as the page.
  }
}

/**
 * Which threads have something the viewer has not read: a comment that was not there when they
 * last had the thread open, or an answer that came since. Their own comments do not count. Read
 * after mount, so a server-rendered page and its first client render agree; until then nothing
 * is unread.
 */
export function useSeen(project: string, comments: Comment[], viewerName: string) {
  const [seen, setSeen] = useState<Seen | null>(null);

  useIsomorphicLayoutEffect(() => setSeen(loadAll()[project] ?? {}), [project]);

  const unseen = useMemo(() => {
    const ids = new Set<string>();
    if (!seen) return ids;
    for (const comment of comments) {
      if (!comment.annotationId || ids.has(comment.annotationId)) continue;
      if (viewerName && comment.auteur === viewerName) continue;
      if (!seen[comment.annotationId]?.includes(keyOf(comment))) ids.add(comment.annotationId);
    }
    return ids;
  }, [seen, comments, viewerName]);

  /** The thread is open: everything in it now is read. */
  const markSeen = useCallback(
    (annotationId: string) => {
      setSeen((prev) => {
        if (!prev) return prev;
        const keys = comments.filter((c) => c.annotationId === annotationId).map(keyOf);
        const before = prev[annotationId] ?? [];
        if (keys.length === before.length && keys.every((k) => before.includes(k))) return prev;
        const next = { ...prev, [annotationId]: keys };
        save(project, next);
        return next;
      });
    },
    [comments, project]
  );

  return { unseen, markSeen };
}
