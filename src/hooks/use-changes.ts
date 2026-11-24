import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { changeCount, unreadReleases, type ReadChanges } from "../utils/changelog";
import type { OrbitRelease } from "../types";

/** What the viewer has read of a project's changes, on this origin: `{ [project]: ReadChanges }`. */
const STORAGE_KEY = "@strakzat/orbit:changes";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Throws when storage refuses: then nothing is new, rather than everything on every load. */
function loadAll(): Record<string, ReadChanges> {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** What is stored, or a first visit: that one starts at the current version, with nothing new. */
function load(project: string, current: string): ReadChanges | null {
  try {
    const all = loadAll();
    const stored = all[project];
    if (typeof stored?.since === "string" && Array.isArray(stored.read)) return stored;
    const first = { since: current, read: [] };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [project]: first }));
    return first;
  } catch {
    return null;
  }
}

/**
 * Which versions are new to the viewer: released since their first visit and not opened yet. Read
 * after mount, so a server-rendered page and its first client render agree.
 */
export function useChanges(project: string, releases: OrbitRelease[]) {
  const [state, setState] = useState<ReadChanges | null>(null);
  const current = releases[0]?.version;

  useIsomorphicLayoutEffect(() => {
    setState(current ? load(project, current) : null);
  }, [project, current]);

  const unread = useMemo(() => unreadReleases(releases, state), [releases, state]);

  const markRead = useCallback(
    (version: string) => {
      if (!current) return;
      // From storage: another tab may have read one since.
      const stored = load(project, current);
      if (!stored || stored.read.includes(version)) return setState(stored);
      const next = { ...stored, read: [...stored.read, version] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadAll(), [project]: next }));
      } catch {
        // Storage refused: read for as long as the page.
      }
      setState(next);
    },
    [project, current]
  );

  return {
    unreadVersions: useMemo(() => new Set(unread.map((r) => r.version)), [unread]),
    unreadCount: unread.reduce((sum, r) => sum + changeCount(r), 0),
    markRead,
  };
}
