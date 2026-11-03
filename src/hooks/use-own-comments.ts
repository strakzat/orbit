import { useCallback, useEffect, useLayoutEffect, useState } from "react";

/**
 * The comments this browser wrote, per project on this origin, with the token the API gave for
 * deleting each: `{ [project]: { [commentId]: token } }`. A comment written elsewhere, or before
 * there were tokens, has none, and cannot be deleted from here.
 */
const STORAGE_KEY = "@strakzat/orbit:own";

type Tokens = Record<string, string>;

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function loadAll(): Record<string, Tokens> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function save(project: string, tokens: Tokens) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadAll(), [project]: tokens }));
  } catch {
    // Storage refused: the comment can be deleted as long as the page is open.
  }
}

/** Read after mount, so a server-rendered page and its first client render agree. */
export function useOwnComments(project: string) {
  const [tokens, setTokens] = useState<Tokens>({});

  useIsomorphicLayoutEffect(() => setTokens(loadAll()[project] ?? {}), [project]);

  const remember = useCallback(
    (id: string, token: string) =>
      setTokens((prev) => {
        const next = { ...prev, [id]: token };
        save(project, next);
        return next;
      }),
    [project]
  );

  const forget = useCallback(
    (id: string) =>
      setTokens((prev) => {
        if (!(id in prev)) return prev;
        const { [id]: _, ...next } = prev;
        save(project, next);
        return next;
      }),
    [project]
  );

  return { tokens, remember, forget };
}
